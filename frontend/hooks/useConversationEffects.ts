"use client";

import { Dispatch, RefObject, SetStateAction, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { HistoryItem, Message } from "@/lib/types";

export function useConversationUrlSync(params: {
  currentConversationId: string;
  history: HistoryItem[];
  historyLoading: boolean;
}) {
  const { currentConversationId, history, historyLoading } = params;

  useEffect(() => {
    if (historyLoading) return;
    const url = new URL(window.location.href);
    const currentParam = url.searchParams.get("c");
    if (!currentConversationId) {
      if (currentParam) {
        url.searchParams.delete("c");
        window.history.replaceState(null, "", url.toString());
      }
      return;
    }

    const matchedItem = history.find((item) => item.id === currentConversationId);
    const displayCode = matchedItem?.short_code || currentConversationId;
    if (matchedItem) {
      if (currentParam !== displayCode) {
        url.searchParams.set("c", displayCode);
        window.history.replaceState(null, "", url.toString());
      }
      return;
    }

    if (currentParam) {
      url.searchParams.delete("c");
      window.history.replaceState(null, "", url.toString());
    }
  }, [currentConversationId, history, historyLoading]);
}

export function useConversationMergeOnLogin(params: {
  user: { id: number; email: string } | null;
  currentConversationId: string;
  messages: Message[];
  fetchHistory: (silent?: boolean) => void;
}) {
  const { user, currentConversationId, messages, fetchHistory } = params;

  useEffect(() => {
    if (user && currentConversationId && messages.length > 0) {
      apiClient.conversations
        .merge(currentConversationId)
        .then(() => fetchHistory(true))
        .catch((err) => {
          const message = err?.message || "";
          if (!message.includes("404") && !message.includes("Conversation not found")) {
            console.error("Merge failed", err);
          }
        });
    }
  }, [user, currentConversationId, fetchHistory, messages.length]);
}

export function useScrollToMessage(params: {
  targetMessageId: number | null;
  setTargetMessageId: Dispatch<SetStateAction<number | null>>;
  messages: Message[];
  endRef: RefObject<HTMLDivElement | null>;
}) {
  const { targetMessageId, setTargetMessageId, messages, endRef } = params;

  useEffect(() => {
    if (targetMessageId) {
      const timer = window.setTimeout(() => {
        const el = document.getElementById(`message-${targetMessageId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("bg-yellow-50", "transition-colors", "duration-1000");
          window.setTimeout(() => el.classList.remove("bg-yellow-50"), 2000);
          setTargetMessageId(null);
        }
      }, 100);
      return () => window.clearTimeout(timer);
    }

    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [targetMessageId, setTargetMessageId, messages, endRef]);
}
