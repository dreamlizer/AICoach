"use client";

import { Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import { Sidebar } from "@/app/components/Sidebar";
import { SearchInterface } from "@/app/components/SearchInterface";
import { AppHeader } from "@/app/components/AppHeader";
import { WelcomeHeader } from "@/app/components/WelcomeHeader";
import { ToolsPanel } from "@/app/components/ToolsPanel";
import { AssessmentToolsPanel } from "@/app/components/AssessmentToolsPanel";
import { ChatInput } from "@/app/components/ChatInput";
import { RecommendedQuestions } from "@/app/components/RecommendedQuestions";
import { ChatMessage } from "@/app/components/ChatMessage";
import { ExecutiveTool, HistoryItem, Message } from "@/lib/types";
import { getToolById } from "@/lib/tools_registry";
import { ModelMode } from "@/lib/stage_settings";

type ConversationLabViewProps = {
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  history: HistoryItem[];
  historyLoading: boolean;
  handleHistoryClick: (item: HistoryItem) => Promise<void>;
  handleNewChat: () => void;
  setToolsPanelOpen: Dispatch<SetStateAction<boolean>>;
  setAssessmentPanelOpen: Dispatch<SetStateAction<boolean>>;
  setActiveAssessmentTool: Dispatch<SetStateAction<string | null>>;
  setSloganLines: Dispatch<SetStateAction<[string, string]>>;
  setSuperMapOpen: Dispatch<SetStateAction<boolean>>;
  startToolSession: (tool: ExecutiveTool) => void;
  currentConversationId: string;
  setSearchOpen: Dispatch<SetStateAction<boolean>>;
  toolsPanelOpen: boolean;
  assessmentPanelOpen: boolean;
  activeToolId: string | null;
  isSuperAdmin: boolean;
  showDebugInfo: boolean;
  setShowDebugInfo: Dispatch<SetStateAction<boolean>>;
  exitToHome: () => void;
  searchOpen: boolean;
  handleSearchResultClick: (conversationId: string, messageId: number) => Promise<void>;
  sloganLines: [string, string];
  isInitializing: boolean;
  messages: Message[];
  greeting: { title: string; content: string } | null;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  handleSendMessage: (event: FormEvent) => Promise<void>;
  handleFilesSelected: (files: FileList | null) => void;
  attachments: { name: string; type: string; text?: string; url?: string }[];
  removeAttachment: (index: number) => void;
  chatLoading: boolean;
  stopGeneration: () => void;
  activeToolPlaceholder: string | null;
  modelMode: ModelMode;
  setModelMode: Dispatch<SetStateAction<ModelMode>>;
  randomQuestions: string[];
  endRef: RefObject<HTMLDivElement | null>;
  t: (key: string) => string;
  showMagicZone: boolean;
  startAssessmentSession: (tool: ExecutiveTool) => void;
};

export function ConversationLabView({
  sidebarOpen,
  setSidebarOpen,
  history,
  historyLoading,
  handleHistoryClick,
  handleNewChat,
  setToolsPanelOpen,
  setAssessmentPanelOpen,
  setActiveAssessmentTool,
  setSloganLines,
  setSuperMapOpen,
  startToolSession,
  currentConversationId,
  setSearchOpen,
  toolsPanelOpen,
  assessmentPanelOpen,
  activeToolId,
  isSuperAdmin,
  showDebugInfo,
  setShowDebugInfo,
  exitToHome,
  searchOpen,
  handleSearchResultClick,
  sloganLines,
  isInitializing,
  messages,
  greeting,
  input,
  setInput,
  handleSendMessage,
  handleFilesSelected,
  attachments,
  removeAttachment,
  chatLoading,
  stopGeneration,
  activeToolPlaceholder,
  modelMode,
  setModelMode,
  randomQuestions,
  endRef,
  t,
  showMagicZone,
  startAssessmentSession,
}: ConversationLabViewProps) {
  return (
    <div className="h-screen overflow-hidden bg-white text-[#060E9F] dark:bg-[#121212] dark:text-blue-400">
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
            setSloganLines(["真正的清晰来自于减法，", "而不是堆叠。"]);
          }}
          onToolClick={(toolId) => {
            if (toolId === "super-map") {
              setSuperMapOpen(true);
              setAssessmentPanelOpen(false);
              setToolsPanelOpen(false);
              setActiveAssessmentTool(null);
              setSloganLines(["超级地图", "中国业务布局一图统览。"]);
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
            setSloganLines(["性格测评", ""]);
            if (window.innerWidth < 768) setSidebarOpen(false);
          }}
        />

        <main className="relative flex flex-1 animate-in flex-col overflow-hidden bg-white fade-in zoom-in-95 transition-opacity duration-500 dark:bg-[#121212]">
          {searchOpen ? (
            <SearchInterface onClose={() => setSearchOpen(false)} onResultClick={handleSearchResultClick} />
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
                onOpenHome={exitToHome}
              />

              <div className="z-10 w-full bg-white/95 pt-12 shadow-sm transition-colors duration-300 dark:bg-[#121212]/95 dark:shadow-none md:pt-0">
                <div className="mx-auto w-full px-3 md:max-w-4xl md:px-4">
                  <WelcomeHeader titleLines={sloganLines} />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="mx-auto flex min-h-full w-full flex-col px-2 md:max-w-4xl md:px-4">
                  <div className="flex-1 pb-40 pt-4 md:pb-56">
                    <div className="mx-auto flex w-full flex-col gap-4 md:max-w-4xl">
                      {toolsPanelOpen ? (
                        <ToolsPanel
                          onToolSelect={startToolSession}
                          onAssessmentSelect={startAssessmentSession}
                          showMagicZone={showMagicZone}
                        />
                      ) : assessmentPanelOpen ? (
                        <AssessmentToolsPanel onToolSelect={startAssessmentSession} />
                      ) : isInitializing ? (
                        <div className="animate-in fade-in flex min-h-[50vh] flex-col items-center justify-center duration-300">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#060E9F]/10 border-t-[#060E9F]" />
                        </div>
                      ) : (
                        <>
                          {messages.length === 0 ? (
                            <div className="animate-in fade-in flex min-h-full flex-col items-center justify-start pb-20 pt-[35vh] duration-700">
                              <div className="mb-1 flex w-full max-w-2xl flex-col items-start transition-all duration-700 ease-in-out">
                                {greeting ? (
                                  <div className="mb-1 w-full px-4 text-left">
                                    <div className="text-[#060E9F] dark:text-[#9AA0A6]">
                                      <div className="font-sans text-lg font-medium dark:font-thin">{greeting.title}</div>
                                    </div>
                                  </div>
                                ) : null}

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
                                  isLoading={chatLoading}
                                  onStop={stopGeneration}
                                  className="pb-4 pt-0 md:pb-6"
                                  placeholder={activeToolPlaceholder || undefined}
                                  toolName={activeToolId ? getToolById(activeToolId)?.name : undefined}
                                />
                              </div>

                              {!activeToolId ? <RecommendedQuestions questions={randomQuestions} onSelect={setInput} /> : null}
                            </div>
                          ) : (
                            messages.map((message) => (
                              <div key={message.id} id={`message-${message.id}`}>
                                <ChatMessage message={message} isSuperAdmin={isSuperAdmin} showDebugInfo={showDebugInfo} />
                              </div>
                            ))
                          )}
                          <div ref={endRef as RefObject<HTMLDivElement>} />
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

      {!toolsPanelOpen && !assessmentPanelOpen && messages.length > 0 ? (
        <div
          className={`fixed bottom-0 right-0 left-0 z-50 border-t border-[#060E9F]/10 bg-white transition-[left] duration-300 dark:border-[#333333] dark:bg-[#121212] ${
            sidebarOpen ? "md:left-[338px]" : ""
          }`}
        >
          <div className="mx-auto flex w-full flex-col items-start px-2 md:max-w-4xl md:px-4">
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
              isLoading={chatLoading}
              onStop={stopGeneration}
              placeholder={t("continuePlaceholder")}
              toolName={activeToolId ? getToolById(activeToolId)?.name : undefined}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

