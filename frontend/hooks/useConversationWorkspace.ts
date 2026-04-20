"use client";

import { Dispatch, MutableRefObject, SetStateAction, useEffect, useRef, useState } from "react";
import { executiveTools, getToolById } from "@/lib/tools_registry";
import { ExecutiveTool, HistoryItem, Message } from "@/lib/types";
import { generateToolSuffix, generateUUID } from "@/lib/utils";

type AppMode =
  | "home"
  | "conversation"
  | "ocr"
  | "dictionary"
  | "assessmentHub"
  | "solarSystem"
  | "winlinez"
  | "pikachuVolleyball"
  | "suika"
  | "skillHub";

export function useConversationWorkspaceState() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState("");
  const [toolsPanelOpen, setToolsPanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [activeToolPlaceholder, setActiveToolPlaceholder] = useState<string | null>(null);
  const [pendingToolTitle, setPendingToolTitle] = useState<string | null>(null);
  const [toolTransition, setToolTransition] = useState<ExecutiveTool | null>(null);
  const [targetMessageId, setTargetMessageId] = useState<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);

  return {
    sidebarOpen,
    setSidebarOpen,
    currentConversationId,
    setCurrentConversationId,
    toolsPanelOpen,
    setToolsPanelOpen,
    searchOpen,
    setSearchOpen,
    activeToolId,
    setActiveToolId,
    activeToolPlaceholder,
    setActiveToolPlaceholder,
    pendingToolTitle,
    setPendingToolTitle,
    toolTransition,
    setToolTransition,
    targetMessageId,
    setTargetMessageId,
    transitionTimerRef,
  };
}

type UseConversationWorkspaceActionsParams = {
  user: { id: number; email: string; name?: string; avatar?: string } | null;
  history: HistoryItem[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  loadConversation: (id: string) => Promise<void>;
  setSloganLines: Dispatch<SetStateAction<[string, string]>>;
  setAppMode: Dispatch<SetStateAction<AppMode>>;
  setAuthModalHint: Dispatch<SetStateAction<string | undefined>>;
  setShowAuthModal: Dispatch<SetStateAction<boolean>>;
  setAssessmentPanelOpen: Dispatch<SetStateAction<boolean>>;
  setActiveAssessmentTool: Dispatch<SetStateAction<string | null>>;
  setSearchOpen: Dispatch<SetStateAction<boolean>>;
  setToolsPanelOpen: Dispatch<SetStateAction<boolean>>;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  currentConversationId: string;
  setCurrentConversationId: Dispatch<SetStateAction<string>>;
  activeToolId: string | null;
  setActiveToolId: Dispatch<SetStateAction<string | null>>;
  setActiveToolPlaceholder: Dispatch<SetStateAction<string | null>>;
  setPendingToolTitle: Dispatch<SetStateAction<string | null>>;
  setTargetMessageId: Dispatch<SetStateAction<number | null>>;
  setToolTransition: Dispatch<SetStateAction<ExecutiveTool | null>>;
  transitionTimerRef: MutableRefObject<number | null>;
  defaultSlogan: [string, string];
};

export function useConversationWorkspaceActions({
  user,
  history,
  setMessages,
  loadConversation,
  setSloganLines,
  setAppMode,
  setAuthModalHint,
  setShowAuthModal,
  setAssessmentPanelOpen,
  setActiveAssessmentTool,
  setSearchOpen,
  setToolsPanelOpen,
  setSidebarOpen,
  currentConversationId,
  setCurrentConversationId,
  activeToolId,
  setActiveToolId,
  setActiveToolPlaceholder,
  setPendingToolTitle,
  setTargetMessageId,
  setToolTransition,
  transitionTimerRef,
  defaultSlogan,
}: UseConversationWorkspaceActionsParams) {
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, [transitionTimerRef]);

  useEffect(() => {
    if (currentConversationId && history.length > 0) {
      const item = history.find((entry) => entry.id === currentConversationId);
      if (item?.tool_id) {
        setActiveToolId(item.tool_id);
        const tool = getToolById(item.tool_id);
        if (tool) {
          setSloganLines(tool.slogan);
          setActiveToolPlaceholder(tool.placeholder || null);
        }
      }
    }
  }, [currentConversationId, history, setActiveToolId, setActiveToolPlaceholder, setSloganLines]);

  const resetLabUIState = () => {
    setToolsPanelOpen(false);
    setAssessmentPanelOpen(false);
    setActiveAssessmentTool(null);
    setSearchOpen(false);
    setTargetMessageId(null);
    setPendingToolTitle(null);
  };

  const clearConversationWorkspace = () => {
    setMessages([]);
    setActiveToolId(null);
    setActiveToolPlaceholder(null);
    setPendingToolTitle(null);
    setTargetMessageId(null);
  };

  const handleHistoryClick = async (item: HistoryItem) => {
    setAppMode("conversation");
    setCurrentConversationId(item.id);
    setActiveToolId(item.tool_id || null);
    resetLabUIState();

    if (item.tool_id) {
      const tool = executiveTools.find((entry) => entry.id === item.tool_id);
      if (tool) {
        setSloganLines(tool.slogan);
        setActiveToolPlaceholder(tool.placeholder || null);
      }
    } else {
      setSloganLines(defaultSlogan);
      setActiveToolPlaceholder(null);
    }

    setMessages([]);
    await loadConversation(item.id);
  };

  const handleNewChat = () => {
    if (!user) {
      const userCreatedConversations = history.filter((item) => !item.user_id && !item.id.startsWith("sample-"));
      if (userCreatedConversations.length >= 3) {
        setAuthModalHint("注册后可获得更多对话次数。");
        setShowAuthModal(true);
        return;
      }
    }

    setAppMode("conversation");
    setCurrentConversationId(generateUUID());
    setMessages([]);
    setActiveToolId(null);
    setActiveToolPlaceholder(null);
    setSloganLines(defaultSlogan);
    resetLabUIState();
  };

  const handleSearchResultClick = async (conversationId: string, messageId: number) => {
    setAppMode("conversation");
    resetLabUIState();
    setCurrentConversationId(conversationId);
    setTargetMessageId(messageId);
    await loadConversation(conversationId);
  };

  const buildToolTitle = (tool: ExecutiveTool) => `${tool.tagPrefix}-${generateToolSuffix()}`;

  const beginToolSession = (tool: ExecutiveTool) => {
    const conversationId = generateUUID();
    const title = buildToolTitle(tool);
    setAppMode("conversation");
    setCurrentConversationId(conversationId);
    setMessages([]);
    setActiveToolId(tool.id);
    setActiveToolPlaceholder(tool.placeholder || null);
    setSloganLines(tool.slogan);
    resetLabUIState();
    setPendingToolTitle(title);
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

  const handleOpenConversationLab = () => {
    setSearchOpen(false);
    setToolsPanelOpen(false);
    setAssessmentPanelOpen(false);
    setActiveAssessmentTool(null);
    setAppMode("conversation");
    setSidebarOpen(true);
    if (!currentConversationId) {
      setCurrentConversationId(generateUUID());
    }
  };

  return {
    resetLabUIState,
    clearConversationWorkspace,
    handleHistoryClick,
    handleNewChat,
    handleSearchResultClick,
    startToolSession,
    handleOpenConversationLab,
  };
}
