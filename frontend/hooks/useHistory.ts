import { useState, useEffect, useCallback } from "react";
import { HistoryItem } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import { SAMPLE_CONVERSATIONS } from "@/lib/sample_data";

export function useHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchHistory = useCallback((silent = false) => {
    // If no user is logged in, show sample conversations instead of fetching from API
    // This prevents anonymous users from seeing a shared pool of history
    if (!user) {
      setHistory(SAMPLE_CONVERSATIONS);
      setHistoryLoading(false);
      return;
    }

    if (!silent) setHistoryLoading(true);
    apiClient.history.list()
      .then((data) => {
        setHistory(data);
      })
      .catch((err) => console.error("Failed to load history:", err))
      .finally(() => {
        if (!silent) setHistoryLoading(false);
      });
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, user]);

  return {
    history,
    historyLoading,
    fetchHistory,
    setHistory
  };
}
