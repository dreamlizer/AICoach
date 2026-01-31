export type ProfileValue = {
  value: string;
  confidence: number; // 0-100
};

export type UserProfile = {
  demographics: Record<string, ProfileValue>;
  personality: string;
  leadership_level: {
    level: string;
    reason: string;
    confidence: number; // 0-100
  };
  analysis_log?: string; // New: AI's thinking process log
  last_updated?: string;
};

export type DebugInfo = {
  stage1: {
    intent: "DECISION" | "EMOTIONAL" | "QUERY" | "CHAT";
    sentiment: string;
    complexity: "HIGH" | "LOW";
    keywords: string[];
  };
  stage2_memory: string;
  stage3_strategy?: string | null;
  stage5_profile?: UserProfile | null;
};

export type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  kind?: "text" | "card" | "thinking" | "analysis";
  debugInfo?: DebugInfo;
  created_at?: string;
};

export type HistoryItem = {
  id: number;
  title: string;
  created_at: string;
};

export interface Stage1Analysis {
  intent: "DECISION" | "EMOTIONAL" | "QUERY" | "CHAT";
  sentiment: string;
  complexity: "HIGH" | "LOW";
  keywords: string[];
}
