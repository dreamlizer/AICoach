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
    intent: string;
    sentiment: string;
    complexity: "HIGH" | "LOW" | "high" | "low";
    keywords: string[];
  };
  stage2_memory: string;
  stage3_strategy?: string | null;
  stage5_profile?: UserProfile | null;
  stats?: {
    stage1: { duration: string; tokens: string };
    stage3: { duration: string; tokens: string };
    stage4: { duration: string; tokens: string };
    total: { duration: string; tokens: string };
  };
};

export type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  kind?: "text" | "card" | "thinking" | "analysis" | "canvas";
  status?: "analyzing" | "thinking" | "replying" | "done"; // New field for thinking state
  thinking_keywords?: string[]; // Keywords for dynamic thinking display
  debugInfo?: DebugInfo;
  canvasHtml?: string;
  created_at?: string;
};

export type HistoryItem = {
  id: string;
  short_code?: string | null;
  title: string;
  created_at: string;
  updated_at?: string;
  tool_id?: string | null;
  user_id?: number | null;
};

export interface Stage1Analysis {
  intent: string;
  sentiment: string;
  complexity: "HIGH" | "LOW" | "high" | "low";
  keywords: string[];
}

export type ExecutiveTool = {
  id: string;
  name: string;
  tagPrefix: string;
  description: string;
  icon: "target" | "stethoscope" | "radar" | "compass" | "scissors" | "map" | "zap" | "brain" | "siren" | "branch" | "message" | "ear" | "users" | "coffee" | "puzzle" | "eye" | "activity";
  category: "self" | "team" | "system" | "partner" | "magic" | "assessment";
  slogan: [string, string];
  prompt: string;
  placeholder?: string;
  nameEn?: string;
  details?: {
    title: string;
    introduction: string;
    usage: string;
    outcome: string;
  };
};
