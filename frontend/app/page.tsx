"use client";

import { useEffect, useRef, useState } from "react";
import { Sidebar } from "@/app/components/Sidebar";
import { ChatMessage } from "@/app/components/ChatMessage";
import { WelcomeHeader } from "@/app/components/WelcomeHeader";
import { ChatInput } from "@/app/components/ChatInput";
import { toolIconMap } from "@/app/components/Icons";
import { executiveTools, ExecutiveTool } from "@/lib/executive_tools";
import { generateToolSuffix, generateUUID } from "@/lib/utils";
import { useChat } from "@/hooks/useChat";
import { useHistory } from "@/hooks/useHistory";
import { Message, HistoryItem } from "@/lib/types";

import { ProjectLogo } from "@/app/components/ProjectLogo";
import { UserMenu } from "@/app/components/UserMenu";
import { SearchInterface } from "@/app/components/SearchInterface";
import { useAuth } from "@/context/auth-context";
import { AuthModal } from "@/app/components/AuthModal";
import { recommendedQuestions } from "@/lib/recommended_questions";
import { Menu, Hammer, Eye, EyeOff } from "lucide-react";

const DEFAULT_SLOGAN: [string, string] = ["真正的清晰来自于减法，", "而不是堆叠"];

import { getGreeting } from "@/lib/greetings";

export default function Page() {
  const { user } = useAuth();
  
  // Super Admin Check
  const isSuperAdmin = user?.email === "14589960@qq.com";
  
  const [showDebugInfo, setShowDebugInfo] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [toolsPanelOpen, setToolsPanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [pendingToolTitle, setPendingToolTitle] = useState<string | null>(null);
  const [sloganLines, setSloganLines] = useState<[string, string]>(DEFAULT_SLOGAN);
  
  // State for scroll targeting
  const [targetMessageId, setTargetMessageId] = useState<number | null>(null);
  const [randomQuestions, setRandomQuestions] = useState<string[]>([]);
  const [greeting, setGreeting] = useState<{ title: string; content: string } | null>(null);

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
    removeAttachment,
    sendMessage,
    selectedModel,
    setSelectedModel,
    loadConversation,
    stopGeneration
  } = useChat(
    currentConversationId, 
    activeToolId, 
    pendingToolTitle, 
    () => fetchHistory(true),
    () => setShowAuthModal(true)
  );

  useEffect(() => {
    // Check URL params for conversation ID
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('c');
    
    if (urlId) {
      setCurrentConversationId(urlId);
      loadConversation(urlId).finally(() => setIsInitializing(false));
    } else {
      setCurrentConversationId(generateUUID());
      setIsInitializing(false);
    }

    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    // Randomly select 4 questions
    const shuffled = [...recommendedQuestions].sort(() => 0.5 - Math.random());
    setRandomQuestions(shuffled.slice(0, 4));
    
    // Set greeting
    const greetingData = getGreeting();
    setGreeting(greetingData);
    
    // Update slogan with greeting content
    const content = greetingData.content;
    const commaIndex = content.indexOf("，");
    if (commaIndex !== -1) {
       setSloganLines([content.substring(0, commaIndex + 1), content.substring(commaIndex + 1)]);
    } else {
       setSloganLines([content, ""]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync URL with conversation ID
  useEffect(() => {
    if (currentConversationId) {
      const url = new URL(window.location.href);
      if (url.searchParams.get('c') !== currentConversationId) {
        url.searchParams.set('c', currentConversationId);
        window.history.replaceState(null, '', url.toString());
      }
    }
  }, [currentConversationId]);

  // Restore tool context from history
  useEffect(() => {
    if (currentConversationId && history.length > 0) {
      const item = history.find(h => h.id === currentConversationId);
      if (item && item.tool_id) {
        setActiveToolId(item.tool_id);
        const tool = executiveTools.find((t) => t.id === item.tool_id);
        if (tool) {
          setSloganLines(tool.slogan);
        }
      }
    }
  }, [currentConversationId, history]);

  // Update greeting with user name when user loads
  useEffect(() => {
    if (greeting && user?.name) {
      setGreeting(prev => prev ? {
        ...prev,
        title: `${user.name}，${prev.title.split('，').pop() || prev.title}`
      } : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.name]);

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
    // Check anonymous conversation limit (max 3)
    if (!user) {
      // Filter out empty conversations from count to avoid counting "just started" ones?
      // Or just count all local history items that are anonymous.
      // Since history includes current user's history (from DB) + local storage for anonymous,
      // and useHistory merges them.
      // But for anonymous users, `history` comes from local storage mainly (if not fetched from DB with userId=null which returns nothing specific).
      // Actually `useHistory` implementation details matter here.
      // Assuming `history` contains the list of conversations visible to the user.
      const anonymousConversations = history.filter(item => !item.user_id); // or just 'history' length if user is null
      if (anonymousConversations.length >= 3) {
        setShowAuthModal(true);
        // alert("未登录用户最多只能开启3个对话，请登录后继续。"); // Optional: User friendly message
        return;
      }
    }

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

      <main className="flex-1 flex flex-col relative bg-white dark:bg-gray-900 overflow-hidden transition-opacity duration-500 animate-in fade-in zoom-in-95">
        
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
                <Menu className="h-5 w-5" />
              </button>
            )}
            {toolsPanelOpen ? (
              <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-[#060E9F] text-white rounded-lg shadow-sm">
                 <Hammer className="w-6 h-6 md:w-7 md:h-7" />
              </div>
            ) : (
              // ADJUST LOGO SIZE HERE: w-10 h-10 (Mobile), md:w-12 md:h-12 (Desktop)
              <ProjectLogo className="w-10 h-10 md:w-16 md:h-16" />
            )}
          </div>

          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            {isSuperAdmin && (
               <button
                 onClick={() => setShowDebugInfo(!showDebugInfo)}
                 className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm hover:text-[#060E9F] transition-colors"
                 title={showDebugInfo ? "Hide Thinking Process" : "Show Thinking Process"}
               >
                 {showDebugInfo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
               </button>
            )}
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
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
                {toolsPanelOpen ? (
                  <div className="w-full rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      高管思维工具库
                    </div>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      {executiveTools.map((tool) => {
                        const Icon = toolIconMap[tool.icon];
                        return (
                          <button
                            key={tool.id}
                            onClick={() => startToolSession(tool)}
                            className="flex flex-col gap-1.5 rounded-xl border border-gray-100 bg-[#F8F9FA] p-3 text-left transition-all hover:border-[#060E9F]/30 hover:bg-white hover:shadow-sm aspect-[4/3]"
                          >
                            <div className="flex items-center">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#060E9F] shadow-sm shrink-0">
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                            </div>
                            <div className="flex-1 flex flex-col justify-start gap-1">
                                <div className="text-sm font-bold text-gray-900">{tool.name}</div>
                                <div className="text-xs text-gray-500 leading-relaxed line-clamp-4">{tool.description}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : isInitializing ? (
                  // Show nothing or loading spinner while initializing
                  <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in duration-300">
                    <div className="w-8 h-8 border-4 border-[#060E9F]/10 border-t-[#060E9F] rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <>
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-start min-h-full pt-[35vh] pb-20 animate-in fade-in duration-700">
                        {/* Greeting Message Logic handles safe space removal */}
                        
                        {/* Centered Chat Input Container */}
                        <div className="w-full max-w-2xl mb-1 transition-all duration-700 ease-in-out">
                           {/* Greeting Message */}
                           {greeting && (
                             <div className="w-full px-4 mb-1 text-left">
                               <div className="text-[#060E9F]">
                                 <div className="text-xl font-medium">{greeting.title}</div>
                               </div>
                             </div>
                           )}
                           <ChatInput 
                            input={input}
                            setInput={setInput}
                            onSubmit={sendMessage}
                            onFilesSelected={handleFilesSelected}
                            attachments={attachments}
                            onRemoveAttachment={removeAttachment}
                            canSubmit={Boolean(input.trim() || attachments.length > 0)}
                            selectedModel={selectedModel}
                            onModelChange={setSelectedModel}
                            isLoading={messages.some(m => m.role === "ai" && (m.status === "analyzing" || m.kind === "thinking"))}
                            onStop={stopGeneration}
                            className="pt-0 pb-4 md:pb-6"
                          />
                        </div>

                        {/* Recommended Questions List */}
                        <div className="flex flex-col gap-1 w-full max-w-2xl px-4 transition-opacity duration-500">
                          {randomQuestions.map((question, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                setInput(question);
                              }}
                              className="text-left py-1 px-4 rounded-xl bg-white border border-gray-100 hover:border-[#060E9F]/20 hover:bg-[#F8F9FA] hover:shadow-sm text-gray-600 hover:text-[#060E9F] transition-all duration-200 group flex items-start"
                            >
                              <span className="mr-3 mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-300 group-hover:bg-[#060E9F] shrink-0 transition-colors"></span>
                              <span className="text-sm font-medium leading-relaxed">
                                {question.length > 20 ? question.slice(0, 20) + "...." : question}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} id={`message-${message.id}`}>
                          <ChatMessage 
                            message={message} 
                            isSuperAdmin={isSuperAdmin} 
                            showDebugInfo={showDebugInfo}
                          />
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

      {!toolsPanelOpen && messages.length > 0 && (
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
          attachments={attachments}
          onRemoveAttachment={removeAttachment}
          canSubmit={Boolean(input.trim() || attachments.length > 0)}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          isLoading={messages.some(m => m.role === "ai" && (m.status === "analyzing" || m.kind === "thinking"))}
          onStop={stopGeneration}
        />
      </div>
      )}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
