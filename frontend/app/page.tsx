"use client";

import { useEffect, useRef, useState } from "react";
import { Sidebar } from "@/app/components/Sidebar";
import { ChatMessage } from "@/app/components/ChatMessage";
import { WelcomeHeader } from "@/app/components/WelcomeHeader";
import { ChatInput } from "@/app/components/ChatInput";
import { toolIconMap } from "@/app/components/Icons";
import { executiveTools, ExecutiveTool } from "@/lib/executive_tools";
import { generateToolSuffix } from "@/lib/utils";
import { useChat } from "@/hooks/useChat";
import { useHistory } from "@/hooks/useHistory";
import { Message, HistoryItem } from "@/lib/types";

import { ProjectLogo } from "@/app/components/ProjectLogo";
import { UserMenu } from "@/app/components/UserMenu";
import { SearchInterface } from "@/app/components/SearchInterface";
import { useAuth } from "@/context/auth-context";
import { AuthModal } from "@/app/components/AuthModal";

const DEFAULT_SLOGAN: [string, string] = ["真正的清晰来自于减法，", "而不是堆叠"];

export default function Page() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState("");
  const [toolsPanelOpen, setToolsPanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [pendingToolTitle, setPendingToolTitle] = useState<string | null>(null);
  const [sloganLines, setSloganLines] = useState<[string, string]>(DEFAULT_SLOGAN);
  
  // State for scroll targeting
  const [targetMessageId, setTargetMessageId] = useState<number | null>(null);
  
  const endRef = useRef<HTMLDivElement | null>(null);

  // Custom Hooks
  const { 
    history, 
    historyLoading, 
    fetchHistory 
  } = useHistory();

  const {
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
  } = useChat(
    currentConversationId, 
    activeToolId, 
    pendingToolTitle, 
    () => fetchHistory(true),
    () => setShowAuthModal(true)
  );

  useEffect(() => {
    setCurrentConversationId(crypto.randomUUID());
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  // Merge anonymous conversation on login
  useEffect(() => {
    if (user && currentConversationId) {
      fetch("/api/conversations/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: currentConversationId }),
      }).catch(err => console.error("Merge failed", err));
    }
  }, [user, currentConversationId]);

  useEffect(() => {
    // Scroll logic:
    // If we have a target message, try to scroll to it.
    // Otherwise, scroll to bottom (default behavior for new messages).
    
    if (targetMessageId) {
       // Give DOM a tick to render
       setTimeout(() => {
         const el = document.getElementById(`message-${targetMessageId}`);
         if (el) {
           el.scrollIntoView({ behavior: "smooth", block: "center" });
           // Optional: Highlight effect
           el.classList.add("bg-yellow-50", "transition-colors", "duration-1000");
           setTimeout(() => el.classList.remove("bg-yellow-50"), 2000);
           
           // Clear target so subsequent renders don't keep jumping
           setTargetMessageId(null);
         }
       }, 100);
    } else {
       endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, targetMessageId]);

  const handleHistoryClick = async (item: HistoryItem) => {
    setCurrentConversationId(item.id);
    setActiveToolId(item.tool_id || null);
    setPendingToolTitle(null);
    setSearchOpen(false); // Close search if open
    setTargetMessageId(null); // Reset scroll target on normal click

    if (item.tool_id) {
      const tool = executiveTools.find((t) => t.id === item.tool_id);
      if (tool) {
        setSloganLines(tool.slogan);
      }
    } else {
      setSloganLines(DEFAULT_SLOGAN);
    }
    setToolsPanelOpen(false);
    setMessages([]); 
    
    await loadConversation(item.id);
  };

  const handleNewChat = () => {
    setCurrentConversationId(crypto.randomUUID());
    setMessages([]);
    setActiveToolId(null);
    setPendingToolTitle(null);
    setSloganLines(DEFAULT_SLOGAN);
    setToolsPanelOpen(false);
    setSearchOpen(false);
    setTargetMessageId(null);
  };

  const handleSearchResultClick = async (conversationId: string, messageId: number) => {
    // 1. Close search
    setSearchOpen(false);
    
    // 2. Set conversation (this will trigger useChat hooks but we might need to manually load to ensure order)
    setCurrentConversationId(conversationId);
    
    // 3. Set target message for scrolling
    setTargetMessageId(messageId);

    // 4. Load history
    await loadConversation(conversationId);
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

  return (
    <div className="h-screen overflow-hidden bg-white text-[#060E9F]">
      <div className="flex h-full">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        history={history}
        historyLoading={historyLoading}
        onHistoryClick={handleHistoryClick}
        onNewChat={handleNewChat}
        onOpenToolLibrary={() => setToolsPanelOpen(true)}
        onToolClick={(toolId) => {
          const tool = executiveTools.find(t => t.id === toolId);
          if (tool) {
            startToolSession(tool);
          }
        }}
        activeConversationId={currentConversationId}
        onSearchClick={() => setSearchOpen(true)}
      />

      <main className="flex-1 flex flex-col relative bg-white dark:bg-gray-900 overflow-hidden transition-colors duration-200">
        
        {/* Main Content Area */}
        {searchOpen ? (
          <SearchInterface 
            onClose={() => setSearchOpen(false)}
            onResultClick={handleSearchResultClick}
          />
        ) : (
          <>
            <div className="absolute top-4 left-4 z-20 flex items-center">
             {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#060E9F]/10 bg-white text-[#060E9F] shadow-sm hover:bg-gray-50 mr-2"
                aria-label="open sidebar"
              >
                <span className="text-lg">☰</span>
              </button>
            )}
            <ProjectLogo className="w-10 h-10 md:w-12 md:h-12" />
          </div>

          <div className="absolute top-4 right-4 z-20">
            <UserMenu />
          </div>

          <div className="z-10 w-full bg-white/95 backdrop-blur-sm shadow-sm pt-14 md:pt-0">
            <div className="mx-auto w-full max-w-4xl px-4">
              <WelcomeHeader titleLines={sloganLines} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4">
              <div className="flex-1 pb-36 pt-4">
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
                {toolsPanelOpen ? (
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
                ) : (
                  <>
                    {messages.length === 0 ? (
                      <div className="mt-12 text-center text-sm font-serif text-[#060E9F]/30 animate-in fade-in duration-1000">
                        这里是你的安全思考空间
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} id={`message-${message.id}`}>
                          <ChatMessage message={message} />
                        </div>
                      ))
                    )}
                    <div ref={endRef} />
                  </>
                )}
              </div>
            </div>
            </div>
          </div>
          </>
        )}
      </main>
      </div>

      {!toolsPanelOpen && (
      <div
        className={`fixed bottom-0 right-0 z-50 border-t border-[#060E9F]/10 bg-white transition-[left] duration-300 left-0 ${
          sidebarOpen ? "md:left-[260px]" : ""
        }`}
      >
        <ChatInput 
          input={input}
          setInput={setInput}
          onSubmit={sendMessage}
          onFilesSelected={handleFilesSelected}
          canSubmit={Boolean(input.trim() || attachments.length > 0)}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>
      )}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
