"use client";

import { useEffect, useRef, useState } from "react";
import { Sidebar } from "@/app/components/Sidebar";
import { ChatMessage } from "@/app/components/ChatMessage";
import { WelcomeHeader } from "@/app/components/WelcomeHeader";
import { ChatInput } from "@/app/components/ChatInput";
import { executiveTools, getToolById } from "@/lib/tools_registry";
import { ExecutiveTool } from "@/lib/types";
import { generateToolSuffix, generateUUID } from "@/lib/utils";
import { useChat } from "@/hooks/useChat";
import { useHistory } from "@/hooks/useHistory";
import { Message, HistoryItem } from "@/lib/types";

import { SearchInterface } from "@/app/components/SearchInterface";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { AuthModal } from "@/app/components/AuthModal";
import { recommendedQuestions } from "@/lib/recommended_questions";
import { AppHeader } from "@/app/components/AppHeader";
import { ToolsPanel } from "@/app/components/ToolsPanel";
import { AssessmentToolsPanel } from "@/app/components/AssessmentToolsPanel";
import { MBTIAssessment } from "@/app/components/MBTIAssessment";
import { FourDAssessment } from "@/app/components/FourDAssessment";
import { PDPAssessment } from "@/app/components/PDPAssessment";
import { SuperMapModal } from "@/app/components/SuperMapModal";
import { RecommendedQuestions } from "@/app/components/RecommendedQuestions";
import { apiClient } from "@/lib/api-client";
import { ReleaseNotesModal } from "@/app/components/ReleaseNotesModal";
import { latestVersion } from "@/lib/release_notes";
// Share2 icon removed


const DEFAULT_SLOGAN: [string, string] = ["真正的清晰来自于减法，", "而不是堆叠"];

const TOOLBOX_SLOGANS: [string, string][] = [
  ["工具不仅仅是器物，", "而是思维的延伸"],
  ["用高维的模型，", "降维打击复杂的难题"],
  ["与其在黑暗中摸索，", "不如点亮手中的火把"]
];

const ASSESSMENT_SLOGANS: [string, string][] = [
  ["向内探索的深度，决定了向外扩张的边界。", ""],
  ["真正的洞察力，始于看见那些你习以为常的盲区。", ""],
  ["所谓性格优势，就是你在高压下无意识打出的王牌。", ""],
  ["在读懂人心之前，先读懂自己这本说明书。", ""],
  ["没有完美的性格，只有最匹配当下战场的领导力。", ""]
];

import { getGreeting } from "@/lib/greetings";

export default function Page() {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // Super Admin Check
  const isSuperAdmin = user?.email === "14589960@qq.com";
  
  const [showDebugInfo, setShowDebugInfo] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [toolsPanelOpen, setToolsPanelOpen] = useState(false);
  const [assessmentPanelOpen, setAssessmentPanelOpen] = useState(false);
  const [activeAssessmentTool, setActiveAssessmentTool] = useState<string | null>(null);
  const [superMapOpen, setSuperMapOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalHint, setAuthModalHint] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [activeToolPlaceholder, setActiveToolPlaceholder] = useState<string | null>(null);
  const [pendingToolTitle, setPendingToolTitle] = useState<string | null>(null);
  const [sloganLines, setSloganLines] = useState<[string, string]>(DEFAULT_SLOGAN);
  const [toolTransition, setToolTransition] = useState<ExecutiveTool | null>(null);
  
  // Release Notes State
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  
  // Magic Zone State
  const [showMagicZone, setShowMagicZone] = useState(false);
  
  // State for scroll targeting
  const [targetMessageId, setTargetMessageId] = useState<number | null>(null);
  const [randomQuestions, setRandomQuestions] = useState<string[]>([]);
  const [greeting, setGreeting] = useState<{ title: string; content: string } | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const assessmentLimit = 3;
  const assessmentWhitelist = new Set(
    (process.env.NEXT_PUBLIC_ASSESSMENT_WHITELIST || "14589960@qq.com")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );

  const getLocalDateKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getAssessmentUsage = () => {
    if (!user) return { date: getLocalDateKey(), count: 0 };
    const key = `assessment_usage_${user.id}`;
    const raw = localStorage.getItem(key);
    if (!raw) return { date: getLocalDateKey(), count: 0 };
    try {
      const parsed = JSON.parse(raw) as { date: string; count: number };
      if (parsed.date !== getLocalDateKey()) {
        return { date: getLocalDateKey(), count: 0 };
      }
      return parsed;
    } catch {
      return { date: getLocalDateKey(), count: 0 };
    }
  };

  const setAssessmentUsage = (count: number) => {
    if (!user) return;
    const key = `assessment_usage_${user.id}`;
    const payload = { date: getLocalDateKey(), count };
    localStorage.setItem(key, JSON.stringify(payload));
  };

  const consumeAssessmentQuota = () => {
    if (user?.email && assessmentWhitelist.has(user.email.toLowerCase())) {
      return true;
    }
    const usage = getAssessmentUsage();
    const remaining = Math.max(0, assessmentLimit - usage.count);
    if (remaining <= 0) {
      setToastMessage("今日评测次数已用完（3次），请明天再来");
      return false;
    }
    const nextCount = usage.count + 1;
    setAssessmentUsage(nextCount);
    const nextRemaining = Math.max(0, assessmentLimit - nextCount);
    setToastMessage(`今日评测剩余 ${nextRemaining} 次`);
    return true;
  };

  // Check for updates on mount
  useEffect(() => {
    // Safety timeout to prevent infinite loading screen
    const safetyTimer = setTimeout(() => {
      setIsInitializing(false);
    }, 3000);

    const lastSeenVersion = localStorage.getItem("last_seen_version");
    if (lastSeenVersion !== latestVersion) {
      // Small delay to ensure smoother entrance
      setTimeout(() => setShowReleaseNotes(true), 1000);
    }

    return () => clearTimeout(safetyTimer);
  }, []);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

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
    modelMode,
    setModelMode,
    loadConversation,
    stopGeneration
  } = useChat(
    currentConversationId, 
    activeToolId, 
    pendingToolTitle, 
    () => fetchHistory(true),
    (reason) => {
      if (reason === "daily_limit") {
         setToastMessage("已超出今日对话限制 (100条)");
      } else {
         setAuthModalHint("注册后获取更多的对话次数");
         setShowAuthModal(true);
      }
    }
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

  // Load Magic Zone State
  useEffect(() => {
    const stored = localStorage.getItem("showMagicZone");
    if (stored === "true") setShowMagicZone(true);
  }, []);

  // Toast Timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Update slogan when entering toolbox
  useEffect(() => {
    if (toolsPanelOpen) {
      const randomSlogan = TOOLBOX_SLOGANS[Math.floor(Math.random() * TOOLBOX_SLOGANS.length)];
      setSloganLines(randomSlogan);
    } else if (assessmentPanelOpen) {
      const randomSlogan = ASSESSMENT_SLOGANS[Math.floor(Math.random() * ASSESSMENT_SLOGANS.length)];
      setSloganLines(randomSlogan);
    } else if (activeToolId) {
        // Do nothing, tool slogan set by startToolSession
    } else {
        // Reset to greeting when closing toolbox and no active tool
        // Re-calculate greeting or use stored greeting
        if (greeting) {
            const content = greeting.content;
            const commaIndex = content.indexOf("，");
            if (commaIndex !== -1) {
               setSloganLines([content.substring(0, commaIndex + 1), content.substring(commaIndex + 1)]);
            } else {
               setSloganLines([content, ""]);
            }
        }
    }
  }, [toolsPanelOpen, assessmentPanelOpen, activeToolId, greeting]);

  // Global error handler for ResizeObserver
  useEffect(() => {
    const errorHandler = (e: ErrorEvent) => {
      if (
        e.message === "ResizeObserver loop limit exceeded" ||
        e.message === "ResizeObserver loop completed with undelivered notifications."
      ) {
        e.stopImmediatePropagation();
        e.preventDefault();
        console.warn("Suppressed ResizeObserver error");
      }
    };
    window.addEventListener("error", errorHandler);
    return () => window.removeEventListener("error", errorHandler);
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
        const tool = getToolById(item.tool_id);
        if (tool) {
          setSloganLines(tool.slogan);
          setActiveToolPlaceholder(tool.placeholder || null);
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
    // Only attempt merge if we have actual messages (conversation exists in DB)
    if (user && currentConversationId && messages.length > 0) {
      apiClient.conversations.merge(currentConversationId)
        .then(() => fetchHistory(true))
        .catch(err => {
          // Suppress 404/Conversation not found errors as they are expected for stale IDs
          const msg = err?.message || "";
          if (!msg.includes("404") && !msg.includes("Conversation not found")) {
            console.error("Merge failed", err);
          }
        });
    }
  }, [user, currentConversationId, fetchHistory, messages.length]);

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

  // Helper to reset UI state for navigation
  const resetUIState = () => {
    setToolsPanelOpen(false);
    setAssessmentPanelOpen(false);
    setActiveAssessmentTool(null);
    setSearchOpen(false);
    setTargetMessageId(null);
    setPendingToolTitle(null);
  };

  const handleHistoryClick = async (item: HistoryItem) => {
    setCurrentConversationId(item.id);
    setActiveToolId(item.tool_id || null);
    resetUIState();

    if (item.tool_id) {
      const tool = executiveTools.find((t) => t.id === item.tool_id);
      if (tool) {
        setSloganLines(tool.slogan);
        setActiveToolPlaceholder(tool.placeholder || null);
      }
    } else {
      setSloganLines(DEFAULT_SLOGAN);
      setActiveToolPlaceholder(null);
    }
    setMessages([]); 
    
    await loadConversation(item.id);
  };

  const handleNewChat = () => {
    // Check anonymous conversation limit (max 3)
    if (!user) {
      // Exclude sample conversations from the limit count
      const userCreatedConversations = history.filter(item => 
        !item.user_id && !item.id.startsWith('sample-')
      );
      
      if (userCreatedConversations.length >= 3) {
        setAuthModalHint("注册后获取更多的对话次数");
        setShowAuthModal(true);
        return;
      }
    }

    setCurrentConversationId(generateUUID());
    setMessages([]);
    setActiveToolId(null);
    setActiveToolPlaceholder(null);
    setSloganLines(DEFAULT_SLOGAN);
    resetUIState();
  };

  const handleSearchResultClick = async (conversationId: string, messageId: number) => {
    // 1. Close search & Reset UI
    resetUIState();
    
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

  const beginToolSession = (tool: ExecutiveTool) => {
    const conversationId = generateUUID();
    const title = buildToolTitle(tool);
    setCurrentConversationId(conversationId);
    setMessages([]);
    setActiveToolId(tool.id);
    setActiveToolPlaceholder(tool.placeholder || null);
    setSloganLines(tool.slogan);
    resetUIState();
    setPendingToolTitle(title); // This needs to be set after reset if reset clears it? reset clears it. So set it after.
  };

  const startToolSession = (tool: ExecutiveTool) => {
    if (tool.id === "mbti") {
      setActiveAssessmentTool("mbti");
      setToolsPanelOpen(false);
      setAssessmentPanelOpen(false);
      return;
    }

    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }

    setToolTransition(tool);
    setToolsPanelOpen(false);
    setAssessmentPanelOpen(false);
    setActiveAssessmentTool(null);
    setSearchOpen(false);

    transitionTimerRef.current = window.setTimeout(() => {
      setToolTransition(null);
      beginToolSession(tool);
    }, 1200);
  };

  const startAssessmentSession = (tool: ExecutiveTool) => {
    if (!user) {
      setAuthModalHint("仅注册用户可使用评测功能");
      setShowAuthModal(true);
      return;
    }
    if (!consumeAssessmentQuota()) return;
    if (tool.id === "mbti" || tool.id === "4d-leadership" || tool.id === "pdp") {
      setActiveAssessmentTool(tool.id);
      setToolsPanelOpen(false);
      setAssessmentPanelOpen(false);
      return;
    }
    startToolSession(tool);
  };

  const handleAssessmentClose = () => {
    setActiveAssessmentTool(null);
    setAssessmentPanelOpen(true);
    setToolsPanelOpen(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    // Magic Zone Toggle Interception
    if (input.trim() === "哈哈哈老马") {
      e?.preventDefault();
      const newState = !showMagicZone;
      setShowMagicZone(newState);
      localStorage.setItem("showMagicZone", String(newState));
      setToastMessage(newState ? "已开启魔法区" : "已隐藏魔法区");
      setInput("");
      return;
    }
    await sendMessage(e);
  };

  return (
    <div className="h-screen overflow-hidden bg-white dark:bg-[#121212] text-[#060E9F] dark:text-blue-400">
      <div className="flex h-full">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        history={history}
        historyLoading={historyLoading}
        onHistoryClick={handleHistoryClick}
        onNewChat={handleNewChat}
        onOpenToolLibrary={() => {
          setToolsPanelOpen(true);
          setAssessmentPanelOpen(false);
          setActiveAssessmentTool(null);
          setSloganLines(DEFAULT_SLOGAN);
        }}
        onToolClick={(toolId) => {
          if (toolId === "super-map") {
            setSuperMapOpen(true);
            setAssessmentPanelOpen(false);
            setToolsPanelOpen(false);
            setActiveAssessmentTool(null);
            setSloganLines(["超级地图", "中国业务布局一图管理"]);
            return;
          }
          const tool = getToolById(toolId);
          if (tool) {
            startToolSession(tool);
          }
        }}
        activeConversationId={currentConversationId}
        onSearchClick={() => setSearchOpen(true)}
        onOpenAssessment={() => {
          setAssessmentPanelOpen(true);
          setToolsPanelOpen(false);
          setSloganLines(["性格评测", ""]);
          // Don't auto-close sidebar on desktop, only mobile
          if (window.innerWidth < 768) setSidebarOpen(false);
        }}
      />

      <main className="flex-1 flex flex-col relative bg-white dark:bg-[#121212] overflow-hidden transition-opacity duration-500 animate-in fade-in zoom-in-95">
        
        {/* Main Content Area */}
        {searchOpen ? (
          <SearchInterface 
            onClose={() => setSearchOpen(false)}
            onResultClick={handleSearchResultClick}
          />
        ) : (
          <>
            <AppHeader
              sidebarOpen={sidebarOpen}
              onSidebarOpen={() => setSidebarOpen(true)}
              toolsPanelOpen={toolsPanelOpen}
              activeToolId={activeToolId}
              isSuperAdmin={isSuperAdmin}
              showDebugInfo={showDebugInfo}
              setShowDebugInfo={setShowDebugInfo}
            />

            <div className="z-10 w-full bg-white/95 dark:bg-[#121212]/95 backdrop-blur-sm shadow-sm dark:shadow-none pt-12 md:pt-0 transition-colors duration-300">
              <div className="mx-auto w-full px-3 md:max-w-4xl md:px-4">
                <WelcomeHeader titleLines={sloganLines} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto flex min-h-full w-full md:max-w-4xl flex-col px-2 md:px-4">
                <div className="flex-1 pb-40 pt-4 md:pb-56">
                <div className="mx-auto flex w-full md:max-w-4xl flex-col gap-4">
                  {toolsPanelOpen ? (
                    <ToolsPanel onToolSelect={startToolSession} onAssessmentSelect={startAssessmentSession} showMagicZone={showMagicZone} />
                  ) : assessmentPanelOpen ? (
                    <AssessmentToolsPanel onToolSelect={startAssessmentSession} />
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
                          <div className="w-full max-w-2xl mb-1 transition-all duration-700 ease-in-out flex flex-col items-start">
                             {/* Greeting Message */}
                             {greeting && (
                               <div className="w-full px-4 mb-1 text-left">
                                 <div className="text-[#060E9F] dark:text-[#9AA0A6]">
                                   <div className="text-lg font-medium dark:font-thin font-sans">{greeting.title}</div>
                                 </div>
                               </div>
                             )}
                            <ChatInput 
                              input={input}
                              setInput={setInput}
                              onSubmit={handleSendMessage}
                              onFilesSelected={handleFilesSelected}
                              attachments={attachments}
                              onRemoveAttachment={removeAttachment}
                              canSubmit={Boolean(input.trim() || attachments.length > 0)}
                              modelMode={modelMode}
                              onModelModeChange={setModelMode}
                              isLoading={messages.some(m => m.role === "ai" && (m.status === "analyzing" || m.kind === "thinking"))}
                              onStop={stopGeneration}
                              className="pt-0 pb-4 md:pb-6"
                              placeholder={activeToolPlaceholder || undefined}
                              toolName={activeToolId ? getToolById(activeToolId)?.name : undefined}
                            />
                          </div>

                          {/* Recommended Questions List */}
                          {!activeToolId && (
                            <RecommendedQuestions 
                              questions={randomQuestions}
                              onSelect={setInput}
                            />
                          )}
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

      {!toolsPanelOpen && !assessmentPanelOpen && messages.length > 0 && (
      <div
        className={`fixed bottom-0 right-0 z-50 border-t border-[#060E9F]/10 dark:border-[#333333] bg-white dark:bg-[#121212] transition-[left] duration-300 left-0 ${
          sidebarOpen ? "md:left-[338px]" : ""
        }`}
      >
        <div className="mx-auto w-full md:max-w-4xl px-2 md:px-4 flex flex-col items-start">
          <ChatInput 
            input={input}
            setInput={setInput}
            onSubmit={handleSendMessage}
            onFilesSelected={handleFilesSelected}
            attachments={attachments}
            onRemoveAttachment={removeAttachment}
            canSubmit={Boolean(input.trim() || attachments.length > 0)}
            modelMode={modelMode}
            onModelModeChange={setModelMode}
            isLoading={messages.some(m => m.role === "ai" && (m.status === "analyzing" || m.kind === "thinking"))}
            onStop={stopGeneration}
            placeholder={t("continuePlaceholder")}
            toolName={activeToolId ? getToolById(activeToolId)?.name : undefined}
          />
        </div>
      </div>
      )}
      
      {/* MBTI Assessment Modal */}
      {activeAssessmentTool === 'mbti' && (
        <MBTIAssessment onClose={handleAssessmentClose} />
      )}

      {/* 4D Assessment Modal */}
      {activeAssessmentTool === '4d-leadership' && (
        <FourDAssessment onClose={handleAssessmentClose} />
      )}

      {activeAssessmentTool === 'pdp' && (
        <PDPAssessment onClose={handleAssessmentClose} />
      )}

      <SuperMapModal
        isOpen={superMapOpen}
        onClose={() => setSuperMapOpen(false)}
        userId={user?.id}
      />

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => {
          setShowAuthModal(false);
          setAuthModalHint(undefined);
        }}
        floatingHint={authModalHint} 
      />
      
      <ReleaseNotesModal 
        isOpen={showReleaseNotes} 
        onClose={() => {
          setShowReleaseNotes(false);
          localStorage.setItem("last_seen_version", latestVersion);
        }}
        mode="latest"
      />
      
      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-red-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl shadow-2xl text-sm font-medium animate-in fade-in slide-in-from-top-4 border border-white/20">
          {toastMessage}
        </div>
      )}

      {toolTransition && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl bg-white dark:bg-[#1E1E1E] shadow-2xl px-6 py-5 flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-10 h-10 rounded-full border-2 border-[#060E9F] border-t-transparent animate-spin"></div>
            <div className="text-sm font-medium text-[#060E9F] dark:text-blue-400">正在进入</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{toolTransition.name}</div>
          </div>
        </div>
      )}
    </div>
  );
}
