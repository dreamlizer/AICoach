import { ModelMode, ModelProvider } from "@/lib/stage_settings";

export type ChatRequestBody = {
  message: string;
  conversationId: string;
  partnerStyle?: string;
  toolId?: string | null;
  toolTitle?: string | null;
  modelProvider?: ModelProvider;
  mode?: ModelMode;
};

export type ChatRequestContext = {
  message: string;
  conversationId: string;
  partnerStyle?: string;
  toolId?: string | null;
  toolTitle?: string | null;
  config: any;
  statsIdentifier: string;
  statsType: "user" | "ip";
  userId: number | null;
  user: { id: number; email: string } | null;
};

export type TokenStats = {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheHitTokens: number;
  cacheMissTokens: number;
};
