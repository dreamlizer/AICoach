import { TokenStats } from "./types";

export function buildDebugInfo(params: {
  config: any;
  partnerStyle?: string;
  analysis: any;
  memory: string;
  strategy: string | null;
  userProfile: any;
  stage1Duration: string;
  stage1UsageLog: string;
  stage3Duration: string;
  stage3UsageLog: string;
  stage4Duration: string;
  stage4UsageLog: string;
  totalDuration: string;
  tokenStats: TokenStats;
}) {
  const {
    config,
    partnerStyle,
    analysis,
    memory,
    strategy,
    userProfile,
    stage1Duration,
    stage1UsageLog,
    stage3Duration,
    stage3UsageLog,
    stage4Duration,
    stage4UsageLog,
    totalDuration,
    tokenStats
  } = params;

  return {
    config_provider: config.provider,
    model_info: {
      stage1: config.stage1.modelName,
      stage3: `${config.stage3.modelName} (${config.stage3.reasoningEffort || "Ordinary"})`,
      stage4: `${config.stage4.modelName} [Prompt: ${partnerStyle === "empathetic" ? "Plan B (共情风格)" : "Plan A (理性风格)"}]`
    },
    stage1: analysis,
    stage2_memory: memory || "无历史记忆",
    stage3_strategy: strategy || "未生成策略",
    stage5_profile: userProfile || "画像更新失败或无变化",
    stats: {
      stage1: { duration: `${stage1Duration}s`, tokens: stage1UsageLog },
      stage3: { duration: `${stage3Duration}s`, tokens: stage3UsageLog },
      stage4: { duration: `${stage4Duration}s`, tokens: stage4UsageLog },
      total: {
        duration: `${totalDuration}s`,
        tokens: `${tokenStats.totalTokens} (In: ${tokenStats.inputTokens}, Out: ${tokenStats.outputTokens})`
      }
    }
  };
}
