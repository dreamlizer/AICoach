"use client";

import { useEffect, useRef, useState } from "react";
import { Message, HistoryItem } from "@/lib/types";
import { MOCK_CHATS } from "@/lib/mock_data";
import { Sidebar } from "@/app/components/Sidebar";
import { ChatMessage } from "@/app/components/ChatMessage";
import { WelcomeHeader } from "@/app/components/WelcomeHeader";
import { ChatInput } from "@/app/components/ChatInput";

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCurrentConversationId(crypto.randomUUID());
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let active = true;
    fetch("/api/history")
      .then((response) => response.json())
      .then((data: HistoryItem[]) => {
        if (!active) return;
        setHistory(data);
      })
      .finally(() => {
        if (!active) return;
        setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
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

  const handleHistoryClick = (title: string) => {
    const mockChat = MOCK_CHATS[title];
    if (mockChat) {
      setMessages(mockChat);
    } else {
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "ai",
          content: `已加载 "${title}" 的历史记录`,
          kind: "text",
        },
      ]);
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(crypto.randomUUID());
    setMessages([]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const thinkingMessage: Message = {
      id: crypto.randomUUID(),
      role: "ai",
      content: "",
      kind: "thinking",
    };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId: currentConversationId }),
      });
      const data = await res.json();
      
      const responseId = crypto.randomUUID();
      const analysisId = crypto.randomUUID();
      
      // Update state: Remove thinking, add Text Response, then add Analysis Card
      setMessages((prev) => {
        const filtered = prev.filter((message) => message.id !== thinkingMessage.id);
        const newMessages: Message[] = [
          ...filtered,
          { id: responseId, role: "ai", content: "", kind: "text" },
        ];
        
        // Add analysis card if debug_info exists
        if (data.debug_info) {
           newMessages.push({
             id: analysisId,
             role: "ai",
             content: "Full-Link Debug",
             kind: "analysis",
             debugInfo: data.debug_info
           });
        }
        return newMessages;
      });

      startTypewriter(responseId, data.reply || "分析完成。");

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
        />

        <div className="flex flex-1 flex-col h-full overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4">
            <WelcomeHeader />

            <main className="flex-1 pb-36 pt-10">
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">

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
        />
      </div>
    </div>
  );
}
