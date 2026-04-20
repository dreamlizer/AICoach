"use client";

import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import { generateUUID } from "@/lib/utils";

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

type UsePageBootstrapParams = {
  loadConversation: (id: string) => Promise<void>;
  setCurrentConversationId: Dispatch<SetStateAction<string>>;
  setAppMode: Dispatch<SetStateAction<AppMode>>;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  setIsInitializing: Dispatch<SetStateAction<boolean>>;
  setRandomQuestions: Dispatch<SetStateAction<string[]>>;
  initializeGreeting: () => void;
  openReleaseNotesIfNeeded: () => void;
  recommendedQuestions: string[];
};

export function usePageBootstrap({
  loadConversation,
  setCurrentConversationId,
  setAppMode,
  setSidebarOpen,
  setIsInitializing,
  setRandomQuestions,
  initializeGreeting,
  openReleaseNotesIfNeeded,
  recommendedQuestions,
}: UsePageBootstrapParams) {
  const initializedRef = useRef(false);

  useEffect(() => {
    const safetyTimer = window.setTimeout(() => {
      setIsInitializing(false);
    }, 3000);

    const releaseTimer = window.setTimeout(() => {
      openReleaseNotesIfNeeded();
    }, 1000);

    return () => {
      window.clearTimeout(safetyTimer);
      window.clearTimeout(releaseTimer);
    };
  }, [setIsInitializing, openReleaseNotesIfNeeded]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const urlId = params.get("c");

    const initConversation = async () => {
      if (urlId) {
        try {
          const resolved = await apiClient.history.resolve(urlId);
          const resolvedId = resolved?.id || urlId;
          setCurrentConversationId(resolvedId);
          setAppMode("conversation");
          await loadConversation(resolvedId);
        } catch {
          setCurrentConversationId(generateUUID());
        } finally {
          setIsInitializing(false);
        }
      } else {
        setCurrentConversationId(generateUUID());
        setIsInitializing(false);
      }
    };

    initConversation();

    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }

    const shuffled = [...recommendedQuestions].sort(() => 0.5 - Math.random());
    setRandomQuestions(shuffled.slice(0, 4));

    initializeGreeting();
  }, [
    initializeGreeting,
    loadConversation,
    setCurrentConversationId,
    setAppMode,
    setIsInitializing,
    setRandomQuestions,
    setSidebarOpen,
    recommendedQuestions,
  ]);
}
