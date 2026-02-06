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
  const [attachments, setAttachments] = useState<{ name: string; type: string; text?: string; url?: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelProvider>("deepseek");
  const { partnerStyle } = usePreferences();
  const [abortController, setAbortController] = useState<AbortController | null>(null);

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
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Load history error:", error);
      }
    } finally {
      setAbortController(null);
    }
  }, []);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const allowedExtensions = ["pdf", "doc", "docx", "ppt", "pptx", "txt", "png", "jpg", "jpeg", "gif"];
    const next: { name: string; type: string; text?: string; url?: string }[] = [];
    
    const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });
    };

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const isImage = file.type.startsWith("image/");
      if (!isImage && !allowedExtensions.includes(ext)) {
        continue;
      }
      if (ext === "txt") {
        const text = await file.text();
        next.push({ name: file.name, type: file.type || "text/plain", text });
      } else if (isImage) {
        try {
          const base64 = await fileToBase64(file);
          next.push({ name: file.name, type: file.type || ext, url: base64 });
        } catch (e) {
          console.error("Failed to convert image to base64", e);
          next.push({ name: file.name, type: file.type || ext });
        }
      } else {
        next.push({ name: file.name, type: file.type || ext });
      }
    }
    if (next.length > 0) {
      setAttachments((prev) => [...prev, ...next]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
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

  const stopGeneration = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    // Always remove thinking message to ensure UI updates immediately
    setMessages((prev) => prev.filter(m => m.kind !== "thinking"));
  }, [abortController]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text && attachments.length === 0) return;

    const controller = new AbortController();
    setAbortController(controller);

    const attachmentSummary = attachments.length
      ? attachments
          .map((item) => {
            if (item.text) return `- ${item.name}\n${item.text}`;
            if (item.url) return `- ${item.name} (${item.type}) [url:${item.url}]`;
            return `- ${item.name} (${item.type})`;
          })
          .join("\n")
      : "";
    const messageWithAttachments = attachmentSummary
      ? `${text ? text : ""}\n\n[附件]\n${attachmentSummary}`.trim()
      : text;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageWithAttachments || "已上传附件",
    };

    const thinkingMessage: Message = {
      id: crypto.randomUUID(),
      role: "ai",
      content: "",
      kind: "thinking",
      status: "analyzing",
    };

    try {
      setMessages((prev) => [...prev, userMessage, thinkingMessage]);
      setInput("");
      setAttachments([]);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
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

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const data = JSON.parse(line);

            if (data.type === "status") {
              setMessages((prev) => 
                prev.map((msg) => 
                  msg.id === thinkingMessage.id 
                    ? { ...msg, status: data.status } 
                    : msg
                )
              );
            } else if (data.type === "data") {
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
            }
          } catch (e) {
            console.error("Error parsing JSON chunk", e);
          }
        }
      }

      return true; // Success

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Chat error:", error);
        setMessages((prev) => 
          prev.map(m => m.id === thinkingMessage.id 
            ? { ...m, kind: "text", content: "抱歉，由于网络或服务原因，暂时无法回答。请稍后重试。", status: undefined }
            : m
          )
        );
      }
    } finally {
      setAbortController(null);
    }
  };

  return {
    messages,
    setMessages,
    input,
    setInput,
    attachments,
    setAttachments,
    handleFilesSelected,
    removeAttachment,
    sendMessage,
    selectedModel,
    setSelectedModel,
    loadConversation,
    stopGeneration
  };
}
