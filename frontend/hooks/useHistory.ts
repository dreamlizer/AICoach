import { useState, useEffect, useCallback } from "react";
import { HistoryItem } from "@/lib/types";

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchHistory = useCallback((silent = false) => {
    if (!silent) setHistoryLoading(true);
    fetch("/api/history", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: HistoryItem[]) => {
        setHistory(data);
      })
      .catch((err) => console.error("Failed to load history:", err))
      .finally(() => {
        if (!silent) setHistoryLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    historyLoading,
    fetchHistory,
    setHistory
  };
}
