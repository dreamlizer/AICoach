"use client";

import { Dispatch, SetStateAction } from "react";
import { ExecutiveTool } from "@/lib/types";

export function useAssessmentEntry(params: {
  user: { id: number; email: string } | null;
  assessmentLimit: number;
  assessmentWhitelist: Set<string>;
  setAuthModalHint: Dispatch<SetStateAction<string | undefined>>;
  setShowAuthModal: Dispatch<SetStateAction<boolean>>;
  setToastMessage: Dispatch<SetStateAction<string | null>>;
  setActiveAssessmentTool: Dispatch<SetStateAction<string | null>>;
  setToolsPanelOpen: Dispatch<SetStateAction<boolean>>;
  setAssessmentPanelOpen: Dispatch<SetStateAction<boolean>>;
  startToolSession: (tool: ExecutiveTool) => void;
}) {
  const {
    user,
    assessmentLimit,
    assessmentWhitelist,
    setAuthModalHint,
    setShowAuthModal,
    setToastMessage,
    setActiveAssessmentTool,
    setToolsPanelOpen,
    setAssessmentPanelOpen,
    startToolSession,
  } = params;

  const getLocalDateKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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
    localStorage.setItem(key, JSON.stringify({ date: getLocalDateKey(), count }));
  };

  const consumeAssessmentQuota = () => {
    if (user?.email && assessmentWhitelist.has(user.email.toLowerCase())) {
      return true;
    }
    const usage = getAssessmentUsage();
    const remaining = Math.max(0, assessmentLimit - usage.count);
    if (remaining <= 0) {
      setToastMessage("今日测评次数已用完（3 次），请明天再来。");
      return false;
    }
    const nextCount = usage.count + 1;
    setAssessmentUsage(nextCount);
    setToastMessage(`今日测评剩余 ${Math.max(0, assessmentLimit - nextCount)} 次。`);
    return true;
  };

  const startAssessmentSession = (tool: ExecutiveTool) => {
    if (!user) {
      setAuthModalHint("仅注册用户可使用测评功能。");
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
    setAssessmentPanelOpen(false);
    setToolsPanelOpen(false);
  };

  return {
    startAssessmentSession,
    handleAssessmentClose,
  };
}
