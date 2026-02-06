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
  config_provider?: string;
  model_info?: {
      stage1: string;
      stage3: string;
      stage4: string;
  };
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
  kind?: "text" | "card" | "thinking" | "analysis" | "canvas";
  status?: "analyzing" | "thinking" | "replying"; // New field for thinking state
  debugInfo?: DebugInfo;
  canvasHtml?: string;
  created_at?: string;
};

export type HistoryItem = {
  id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  tool_id?: string | null;
  user_id?: number | null;
};

export interface Stage1Analysis {
  intent: "DECISION" | "EMOTIONAL" | "QUERY" | "CHAT" | "tool_execution";
  sentiment: string;
  complexity: "HIGH" | "LOW" | "high" | "low";
  keywords: string[];
}
