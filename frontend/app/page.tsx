"use client";

import { useEffect, useRef, useState } from "react";
import type { ElementType } from "react";
import { Message, HistoryItem } from "@/lib/types";
import { Sidebar } from "@/app/components/Sidebar";
import { ChatMessage } from "@/app/components/ChatMessage";
import { WelcomeHeader } from "@/app/components/WelcomeHeader";
import { ChatInput } from "@/app/components/ChatInput";
import { executiveTools, ExecutiveTool } from "@/lib/executive_tools";
import { Target, Stethoscope } from "lucide-react";

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<
    { name: string; type: string; text?: string }[]
  >([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState("");
  const [toolsPanelOpen, setToolsPanelOpen] = useState(false);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [pendingToolTitle, setPendingToolTitle] = useState<string | null>(null);
  const [sloganLines, setSloganLines] = useState<[string, string]>([
    "真正的清晰来自于减法，",
    "而不是堆叠"
  ]);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCurrentConversationId(crypto.randomUUID());
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchHistory = () => {
    // Silent update (don't set loading to true to avoid UI flicker)
    fetch("/api/history", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: HistoryItem[]) => {
        setHistory(data);
      })
      .catch((err) => console.error("Failed to load history:", err));
  };

  useEffect(() => {
    setHistoryLoading(true);
    fetch("/api/history", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: HistoryItem[]) => {
        setHistory(data);
      })
      .catch((err) => console.error("Failed to load history:", err))
      .finally(() => {
        setHistoryLoading(false);
      });
  }, []);

  const updateMessage = (id: string, content: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, content } : message
      )
    );
  };

  const startTypewriter = (id: string, text: string) => {
    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      updateMessage(id, text.slice(0, index));
      if (index >= text.length) {
        clearInterval(interval);
      }
    }, 40);
  };

  const extractHtmlFromText = (text: string) => {
    const htmlFence = text.match(/```html\s*([\s\S]*?)```/i);
    if (htmlFence) return htmlFence[1].trim();
    const genericFence = text.match(/```([\s\S]*?)```/);
    if (genericFence && /<\/?[a-z][\s\S]*>/i.test(genericFence[1])) {
      return genericFence[1].trim();
    }
    const inlineHtml = text.match(/(<html[\s\S]*<\/html>)/i);
    if (inlineHtml) return inlineHtml[1].trim();
    return null;
  };

  const stripHtmlFromText = (text: string) => {
    let result = text;
    result = result.replace(/```html\s*[\s\S]*?```/gi, "");
    result = result.replace(/```[\s\S]*?```/g, (block) =>
      /<\/?[a-z][\s\S]*>/i.test(block) ? "" : block
    );
    result = result.replace(/<html[\s\S]*<\/html>/gi, "");
    return result.trim();
  };

  const sanitizeHtml = (html: string) => {
    return html.trim();
  };

  const handleHistoryClick = async (item: HistoryItem) => {
    setCurrentConversationId(item.id);
    setActiveToolId(item.tool_id || null);
    setPendingToolTitle(null);
    if (item.tool_id) {
      const tool = executiveTools.find((t) => t.id === item.tool_id);
      if (tool) {
        setSloganLines(tool.slogan);
      }
    } else {
      setSloganLines(["真正的清晰来自于减法，", "而不是堆叠"]);
    }
    setToolsPanelOpen(false);
    setMessages([]); // Clear current view while loading
    
    try {
      const res = await fetch(`/api/history/${item.id}`);
      if (!res.ok) throw new Error("Failed to load conversation");
      
      const data = await res.json();
      
      const uiMessages: Message[] = [];
      data.forEach((msg: any) => {
        const baseMsg: Message = {
          id: msg.id.toString(),
          role: msg.role,
          content: msg.content,
          kind: msg.kind || "text"
        };

        if (msg.kind === "analysis" && msg.metadata) {
          try {
            baseMsg.debugInfo = JSON.parse(msg.metadata);
          } catch (e) {
            console.error("Failed to parse analysis metadata", e);
          }
        }

        if (baseMsg.kind === "text") {
          const extracted = extractHtmlFromText(baseMsg.content);
          const cleaned = stripHtmlFromText(baseMsg.content);
          if (extracted) {
            baseMsg.content = cleaned || "已生成卡片，请在画布查看。";
          } else if (cleaned) {
            baseMsg.content = cleaned;
          }
          uiMessages.push(baseMsg);
          if (extracted) {
            uiMessages.push({
              id: `${baseMsg.id}-canvas`,
              role: "ai",
              content: "",
              kind: "canvas",
              canvasHtml: sanitizeHtml(extracted)
            });
          }
        } else {
          uiMessages.push(baseMsg);
        }
      });
      
      setMessages(uiMessages);
    } catch (error) {
      console.error("Load history error:", error);
      // Fallback or error toast
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(crypto.randomUUID());
    setMessages([]);
    setActiveToolId(null);
    setPendingToolTitle(null);
    setSloganLines(["真正的清晰来自于减法，", "而不是堆叠"]);
    setToolsPanelOpen(false);
  };

  const toolIconMap: Record<string, ElementType> = {
    target: Target,
    stethoscope: Stethoscope
  };

  const generateToolSuffix = () => {
    const value = crypto.getRandomValues(new Uint32Array(1))[0];
    return value.toString(36).slice(0, 4).toUpperCase();
  };

  const buildToolTitle = (tool: ExecutiveTool) => {
    return `${tool.tagPrefix}-${generateToolSuffix()}`;
  };

  const startToolSession = (tool: ExecutiveTool) => {
    const conversationId = crypto.randomUUID();
    const title = buildToolTitle(tool);
    setCurrentConversationId(conversationId);
    setMessages([]);
    setActiveToolId(tool.id);
    setPendingToolTitle(title);
    setSloganLines(tool.slogan);
    setToolsPanelOpen(false);
  };

  const handleToolClickById = (toolId: string) => {
    const tool = executiveTools.find((item) => item.id === toolId);
    if (!tool) return;
    startToolSession(tool);
  };

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
          conversationId: currentConversationId,
          toolId: activeToolId,
          toolTitle: pendingToolTitle
        }),
      });
      const data = await res.json();
      
      const responseId = crypto.randomUUID();
      const analysisId = crypto.randomUUID();
      const canvasId = crypto.randomUUID();
      const extractedHtml = extractHtmlFromText(data.reply || "");
      const cleanedReply = stripHtmlFromText(data.reply || "");
      const replyText =
        cleanedReply || (extractedHtml ? "已生成卡片，请在画布查看。" : "分析完成。");
      
      // Update state: Remove thinking, add Text Response, then add Analysis Card
      setMessages((prev) => {
        const filtered = prev.filter((message) => message.id !== thinkingMessage.id);
        
        // Critical: Render Analysis Card FIRST (before text reply) for logical flow, 
        // or AFTER (as an appendix). User preference: "Process must be visible".
        // Let's render it AFTER text for now, but ensure it's saved/loaded correctly.
        // Actually, previous logic was Text then Analysis. Let's keep it consistent with DB.
        
        const newMessages: Message[] = [...filtered];

        // 1. Add Text Response
        newMessages.push({ id: responseId, role: "ai", content: replyText, kind: "text" });
        
        // 2. Add Analysis Card if debug_info exists
        // NOTE: This relies on the API returning 'debug_info'. 
        // We verified api/chat/route.ts returns { reply, debug_info: debugInfo }? 
        // Let's double check API response structure.
        if (data.debug_info) {
           newMessages.push({
             id: analysisId,
             role: "ai",
             content: "Full-Link Debug",
             kind: "analysis",
             debugInfo: data.debug_info
           });
        }
        if (extractedHtml) {
          newMessages.push({
            id: canvasId,
            role: "ai",
            content: "",
            kind: "canvas",
            canvasHtml: sanitizeHtml(extractedHtml)
          });
        }
        return newMessages;
      });

      startTypewriter(responseId, replyText);
      if (pendingToolTitle) {
        setPendingToolTitle(null);
      }
      
      // Silent History Refresh to update sidebar
      fetchHistory();

    } catch (error) {
      console.error("Chat error:", error);
      const responseId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev.filter((message) => message.id !== thinkingMessage.id),
        { id: responseId, role: "ai", content: "抱歉，系统出现了一些问题，请稍后再试。", kind: "text" },
      ]);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-white text-[#060E9F]">
      {/* Fixed Toggle Button (Only visible when sidebar is closed) */}
      {!sidebarOpen && (
        <div className="fixed left-4 top-4 z-20 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#060E9F]/10 bg-white text-[#060E9F] shadow-sm hover:bg-gray-50"
            aria-label="open sidebar"
          >
            <span className="text-lg">☰</span>
          </button>
        </div>
      )}

      <div className="flex h-full">
        <Sidebar 
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          history={history}
          historyLoading={historyLoading}
          onHistoryClick={handleHistoryClick}
          onNewChat={handleNewChat}
          onOpenToolLibrary={() => {
            setToolsPanelOpen((prev) => {
              const next = !prev;
              if (next) {
                setSloganLines(["站得更高，", "才能看得更远"]);
              } else if (activeToolId) {
                const tool = executiveTools.find((t) => t.id === activeToolId);
                if (tool) {
                  setSloganLines(tool.slogan);
                }
              } else {
                setSloganLines(["真正的清晰来自于减法，", "而不是堆叠"]);
              }
              return next;
            });
          }}
          onToolClick={handleToolClickById}
        />

        <div className="flex flex-1 flex-col h-full overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4">
            <WelcomeHeader titleLines={sloganLines} />

            <main className="flex-1 pb-36 pt-10">
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
                {toolsPanelOpen && (
                  <div className="w-full rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      高管思维工具库
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      {executiveTools.map((tool) => {
                        const Icon = toolIconMap[tool.icon];
                        return (
                          <button
                            key={tool.id}
                            onClick={() => startToolSession(tool)}
                            className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-[#F8F9FA] p-4 text-left transition-all hover:border-[#060E9F]/30 hover:bg-white hover:shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#060E9F] shadow-sm">
                                <Icon className="h-4 w-4" />
                              </div>
                              <span className="text-[10px] font-semibold text-gray-400">工具</span>
                            </div>
                            <div className="text-sm font-semibold text-gray-900">{tool.name}</div>
                            <div className="text-xs text-gray-500 leading-relaxed">{tool.description}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {messages.length === 0 ? (
                  <div className="mt-12 text-center text-sm font-serif text-[#060E9F]/30 animate-in fade-in duration-1000">
                    这里是你的安全思考空间
                  </div>
                ) : (
                  messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))
                )}
                <div ref={endRef} />
              </div>
            </main>
          </div>
        </div>
      </div>

      <div
        className={`fixed bottom-0 right-0 border-t border-[#060E9F]/10 bg-white ${
          sidebarOpen ? "left-[260px]" : "left-0"
        }`}
      >
        <ChatInput 
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          onFilesSelected={handleFilesSelected}
          canSubmit={Boolean(input.trim() || attachments.length > 0)}
        />
      </div>
    </div>
  );
}
