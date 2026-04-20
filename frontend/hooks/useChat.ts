import { useState, useCallback } from "react";
import { Message } from "@/lib/types";
import { extractHtmlFromText, stripHtmlFromText, processHistoryMessage, generateUUID } from "@/lib/utils";
import { ModelMode } from "@/lib/stage_settings";
import { usePreferences } from "@/context/preferences-context";
import { SAMPLE_MESSAGES } from "@/lib/sample_data";
import { apiClient } from "@/lib/api-client";

type ChatAttachment = {
  name: string;
  type: string;
  text?: string;
  url?: string;
};

const ALLOWED_FILE_EXTENSIONS = ["pdf", "doc", "docx", "ppt", "pptx", "txt", "png", "jpg", "jpeg", "gif"];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

async function normalizeAttachment(file: File): Promise<ChatAttachment | null> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const isImage = file.type.startsWith("image/");

  if (!isImage && !ALLOWED_FILE_EXTENSIONS.includes(ext)) {
    return null;
  }

  if (ext === "txt") {
    return { name: file.name, type: file.type || "text/plain", text: await file.text() };
  }

  if (isImage) {
    try {
      const base64 = await fileToBase64(file);
      return { name: file.name, type: file.type || ext, url: base64 };
    } catch (error) {
      console.error("Failed to convert image to base64", error);
    }
  }

  return { name: file.name, type: file.type || ext };
}

function buildAttachmentSummary(attachments: ChatAttachment[]) {
  if (attachments.length === 0) return "";

  return attachments
    .map((item) => {
      if (item.text) return `- ${item.name}\n${item.text}`;
      if (item.url) return `- ${item.name} (${item.type}) [url:${item.url}]`;
      return `- ${item.name} (${item.type})`;
    })
    .join("\n");
}

function removeThinkingMessage(prev: Message[], thinkingMessageId: string) {
  return prev.filter((message) => message.id !== thinkingMessageId);
}

export function useChat(
  conversationId: string, 
  activeToolId: string | null, 
  pendingToolTitle: string | null,
  onHistoryUpdate: () => void,
  onLimitReached?: (reason?: "anonymous" | "daily_limit") => void
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [modelMode, setModelMode] = useState<ModelMode>("fast");
  const { partnerStyle, modelProvider } = usePreferences();
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const loadConversation = useCallback(async (id: string) => {
    // Check if it's a sample conversation
    if (SAMPLE_MESSAGES[id]) {
      setMessages(SAMPLE_MESSAGES[id]);
      return;
    }

    try {
      const data = await apiClient.history.get(id);
      
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
    const next: ChatAttachment[] = [];

    for (const file of Array.from(files)) {
      const attachment = await normalizeAttachment(file);
      if (attachment) {
        next.push(attachment);
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
    setMessages((prev) => prev.filter((message) => message.kind !== "thinking"));
  }, [abortController]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text && attachments.length === 0) return;

    const controller = new AbortController();
    setAbortController(controller);

    const attachmentSummary = buildAttachmentSummary(attachments);
    const messageWithAttachments = attachmentSummary
      ? `${text ? text : ""}\n\n[附件]\n${attachmentSummary}`.trim()
      : text;

    const userMessage: Message = {
      id: generateUUID(),
      role: "user",
      content: messageWithAttachments || "已上传附件",
    };

    const thinkingMessage: Message = {
      id: generateUUID(),
      role: "ai",
      content: "",
      kind: "thinking",
      status: "analyzing",
    };

    try {
      setMessages((prev) => [...prev, userMessage, thinkingMessage]);
      const currentInput = input; // Preserve input
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
          modelProvider: modelProvider,
          mode: modelMode,
          partnerStyle: partnerStyle
        }),
      });

      if (res.status === 403) {
        // Limit reached
        setMessages((prev) =>
          prev.filter((message) => message.id !== userMessage.id && message.id !== thinkingMessage.id)
        );
        
        // Restore input
        setInput(currentInput);

        try {
          const data = await res.json();
          const reason = data.code === "DAILY_LIMIT_REACHED" ? "daily_limit" : "anonymous";
          if (onLimitReached) onLimitReached(reason);
        } catch (e) {
          // Fallback if json parse fails
          if (onLimitReached) onLimitReached("anonymous");
        }
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
            const jsonStr = line.replace(/^data: /, "").trim();
            if (!jsonStr) continue;
            const data = JSON.parse(jsonStr);

            if (data.type === "status") {
              setMessages((prev) => 
                prev.map((msg) => 
                  msg.id === thinkingMessage.id 
                    ? { 
                        ...msg, 
                        status: data.status,
                        thinking_keywords: data.keywords || msg.thinking_keywords 
                      } 
                    : msg
                )
              );
            } else if (data.type === "data") {
              const responseId = generateUUID();
              const analysisId = generateUUID();
              const canvasId = generateUUID();
              const extractedHtml = extractHtmlFromText(data.reply || "");
              const cleanedReply = stripHtmlFromText(data.reply || "");
              const replyText =
                cleanedReply || (extractedHtml ? "已生成卡片，请在画布查看。" : "分析完成。");
              
              setMessages((prev) => {
                const newMessages: Message[] = [...removeThinkingMessage(prev, thinkingMessage.id)];

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
    modelMode,
    setModelMode,
    loadConversation,
    stopGeneration
  };
}
