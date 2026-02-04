import { useState, useCallback } from "react";
import { Message } from "@/lib/types";
import { extractHtmlFromText, stripHtmlFromText, processHistoryMessage } from "@/lib/utils";
import { ModelProvider } from "@/lib/stage_settings";
import { usePreferences } from "@/context/preferences-context";

export function useChat(
  conversationId: string, 
  activeToolId: string | null, 
  pendingToolTitle: string | null,
  onHistoryUpdate: () => void,
  onLimitReached?: () => void
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<{ name: string; type: string; text?: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelProvider>("deepseek");
  const { partnerStyle } = usePreferences();

  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`);
      if (!res.ok) throw new Error("Failed to load conversation");
      
      const data = await res.json();
      
      const uiMessages: Message[] = [];
      data.forEach((msg: any) => {
        uiMessages.push(...processHistoryMessage(msg));
      });
      
      setMessages(uiMessages);
    } catch (error) {
      console.error("Load history error:", error);
    }
  }, []);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const allowedExtensions = ["pdf", "doc", "docx", "ppt", "pptx", "txt"];
    const next: { name: string; type: string; text?: string }[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const isImage = file.type.startsWith("image/");
      if (!isImage && !allowedExtensions.includes(ext)) {
        continue;
      }
      if (ext === "txt") {
        const text = await file.text();
        next.push({ name: file.name, type: file.type || "text/plain", text });
      } else {
        next.push({ name: file.name, type: file.type || ext });
      }
    }
    if (next.length > 0) {
      setAttachments((prev) => [...prev, ...next]);
    }
  };

  const updateMessage = useCallback((id: string, content: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, content } : message
      )
    );
  }, []);

  const startTypewriter = useCallback((id: string, text: string) => {
    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      updateMessage(id, text.slice(0, index));
      if (index >= text.length) {
        clearInterval(interval);
      }
    }, 40);
  }, [updateMessage]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text && attachments.length === 0) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text || "已上传附件",
    };

    const thinkingMessage: Message = {
      id: crypto.randomUUID(),
      role: "ai",
      content: "",
      kind: "thinking",
    };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setInput("");
    setAttachments([]);

    try {
      const attachmentSummary = attachments.length
        ? attachments
            .map((item) =>
              item.text
                ? `- ${item.name}\n${item.text}`
                : `- ${item.name} (${item.type})`
            )
            .join("\n")
        : "";
      const messageWithAttachments = attachmentSummary
        ? `${text ? text : ""}\n\n[附件]\n${attachmentSummary}`.trim()
        : text;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: messageWithAttachments, 
          conversationId: conversationId,
          toolId: activeToolId,
          toolTitle: pendingToolTitle,
          modelProvider: selectedModel,
          partnerStyle: partnerStyle
        }),
      });

      if (res.status === 403) {
        // Limit reached
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id && m.id !== thinkingMessage.id));
        if (onLimitReached) onLimitReached();
        return;
      }

      const data = await res.json();
      
      const responseId = crypto.randomUUID();
      const analysisId = crypto.randomUUID();
      const canvasId = crypto.randomUUID();
      const extractedHtml = extractHtmlFromText(data.reply || "");
      const cleanedReply = stripHtmlFromText(data.reply || "");
      const replyText =
        cleanedReply || (extractedHtml ? "已生成卡片，请在画布查看。" : "分析完成。");
      
      setMessages((prev) => {
        const filtered = prev.filter((message) => message.id !== thinkingMessage.id);
        const newMessages: Message[] = [...filtered];

        if (data.debug_info) {
           newMessages.push({
             id: analysisId,
             role: "ai",
             content: "Full-Link Debug",
             kind: "analysis",
             debugInfo: data.debug_info
           });
        }

        newMessages.push({ id: responseId, role: "ai", content: replyText, kind: "text" });
        if (extractedHtml) {
          newMessages.push({
            id: canvasId,
            role: "ai",
            content: "",
            kind: "canvas",
            canvasHtml: extractedHtml.trim()
          });
        }
        return newMessages;
      });

      startTypewriter(responseId, replyText);
      onHistoryUpdate();

      return true; // Success

    } catch (error) {
      console.error("Chat error:", error);
      const responseId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev.filter((message) => message.id !== thinkingMessage.id),
        { id: responseId, role: "ai", content: "抱歉，系统出现了一些问题，请稍后再试。", kind: "text" },
      ]);
      return false;
    }
  };

  return {
    messages,
    setMessages,
    input,
    setInput,
    attachments,
    handleFilesSelected,
    sendMessage,
    selectedModel,
    setSelectedModel,
    loadConversation
  };
}
