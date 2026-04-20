﻿﻿﻿﻿﻿import { NextResponse } from "next/server";
import {
  getRecentHistory,
  stage1_analyze,
  stage3Think,
  stage4Reply,
  generateTitle,
  generateRealtimeStatus,
} from "@/lib/pipeline";
import { getMessagesFromDb, saveMessageToDb, updateConversationTitle } from "@/lib/db";
import {
  STAGE4_PROMPT,
  STAGE4_PROMPT_EMPATHETIC,
  getModelConfig,
  ModelProvider,
  ModelMode,
} from "@/lib/stage_settings";
import { Stage1Analysis } from "@/lib/types";
import { loadServerEnv } from "@/lib/server/chat/env";
import { resolveIdentityContext } from "@/lib/server/chat/request-context";
import { encodeChunk, createSseResponse } from "@/lib/server/chat/sse";
import { buildEffectiveToolPrompt } from "@/lib/server/chat/tooling";
import { writeStatsSafely } from "@/lib/server/chat/stats";
import { buildDebugInfo } from "@/lib/server/chat/debug";
import { ChatRequestBody, ChatRequestContext, TokenStats } from "@/lib/server/chat/types";

async function generateFinalReply(params: {
  message: string;
  toolId?: string | null;
  partnerStyle?: string;
  config: any;
  strategy: string | null;
  effectiveToolPrompt?: string;
}) {
  const { generateGrowCard, checkGrowTrigger } = await import("@/lib/grow_utils");
  const { message, toolId, partnerStyle, config, strategy, effectiveToolPrompt } = params;
  const { isSample, isCard } = checkGrowTrigger(toolId || null, message);
  const isGrowCardRequest = isSample || isCard;

  if (isGrowCardRequest) {
    const growCardResult = await generateGrowCard(toolId || null, message, effectiveToolPrompt || "", config, strategy || undefined);
    if (growCardResult.html) {
      return { aiReply: growCardResult.html, stage4Usage: growCardResult.usage };
    }
  }

  const replyPromptTemplate = partnerStyle === "empathetic" ? STAGE4_PROMPT_EMPATHETIC : STAGE4_PROMPT;
  const finalPrompt = replyPromptTemplate.replace("{stage3_strategy}", strategy || "");
  const replyResult = strategy
    ? await stage4Reply(strategy, config, finalPrompt, effectiveToolPrompt)
    : {
        reply: isGrowCardRequest
          ? "Sorry, I cannot generate the growth card right now."
          : "Sorry, I am unable to continue thinking right now.",
        usage: undefined,
      };

  return { aiReply: replyResult.reply, stage4Usage: replyResult.usage };
}

function applyUsage(tokenStats: TokenStats, usage?: any) {
  if (!usage) return;
  tokenStats.totalTokens += usage.total_tokens;
  tokenStats.inputTokens += usage.prompt_tokens;
  tokenStats.outputTokens += usage.completion_tokens;
  tokenStats.cacheHitTokens += usage.prompt_cache_hit_tokens || 0;
  tokenStats.cacheMissTokens += usage.prompt_cache_miss_tokens || 0;
}

function formatUsageLog(usage?: any) {
  if (!usage) return "N/A";
  return `${usage.total_tokens} (In: ${usage.prompt_tokens}, Out: ${usage.completion_tokens})`;
}

export class ChatService {
  static async handleRequest(request: Request) {
    try {
      const body = (await request.json()) as ChatRequestBody;
      const { message, conversationId, partnerStyle, toolId, toolTitle, modelProvider, mode } = body;

      const identity = await resolveIdentityContext(conversationId);
      if (identity.errorResponse) {
        return identity.errorResponse;
      }

      const runtimeKeys = loadServerEnv();
      const config = getModelConfig(
        (modelProvider as ModelProvider) || "deepseek",
        (mode as ModelMode) || "pro",
        runtimeKeys
      );

      if (!config.stage1.apiKey) {
        console.error("[CRITICAL] API Key is missing. Please check .env.local file.");
      }

      try {
        await saveMessageToDb(conversationId, "user", message, "text", null, identity.userId, toolTitle || null, toolId || null);
      } catch (dbError) {
        console.error("DB Save Error (User):", dbError);
        return NextResponse.json({ error: "Failed to save message history", code: "DB_ERROR" }, { status: 500 });
      }

      const ctx: ChatRequestContext = {
        message,
        conversationId,
        toolId,
        toolTitle,
        partnerStyle,
        config,
        statsIdentifier: identity.statsIdentifier!,
        statsType: identity.statsType!,
        userId: identity.userId!,
        user: identity.user!,
      };

      const stream = new ReadableStream({
        async start(controller) {
          await ChatService.streamLogic(controller, ctx);
        },
      });

      return createSseResponse(stream);
    } catch (error) {
      console.error("Chat Service Error:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  }

  private static async streamLogic(controller: ReadableStreamDefaultController, ctx: ChatRequestContext) {
    const { message, conversationId, toolId, toolTitle, config, statsIdentifier, statsType, partnerStyle, user } = ctx;
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);

    console.log(`\n=== [${requestId}] New Request Started ===`);
    console.log(`User: ${statsIdentifier} (${statsType})`);
    console.log(`Provider: ${config.provider}`);
    console.log(`Tool: ${toolTitle || "General Chat"} (${toolId || "none"})`);

    try {
      console.log(`\n[${requestId}] Status: Analyzing...`);
      console.log(`   Model: ${config.stage1.modelName}`);
      controller.enqueue(encodeChunk({ type: "status", status: "analyzing" }));

      const memory = await getRecentHistory(conversationId);
      const { tool, effectiveToolPrompt } = buildEffectiveToolPrompt(toolId);
      const tokenStats: TokenStats = {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheHitTokens: 0,
        cacheMissTokens: 0,
      };

      const stage1Start = Date.now();
      const analysisPromise = effectiveToolPrompt
        ? Promise.resolve({
            analysis: {
              intent: `tool_execution: ${tool?.name || toolId}`,
              sentiment: "neutral",
              complexity: "high",
              keywords: [],
            } as Stage1Analysis,
            usage: undefined,
          })
        : stage1_analyze(message, config);

      const [analysisResult] = await Promise.allSettled([analysisPromise]);
      const stage1Duration = ((Date.now() - stage1Start) / 1000).toFixed(2);
      const analysisData = analysisResult.status === "fulfilled" ? analysisResult.value : null;
      const analysis: Stage1Analysis = analysisData?.analysis || {
        intent: "CHAT",
        sentiment: "Unknown",
        complexity: "LOW",
        keywords: ["Error"],
      };

      applyUsage(tokenStats, analysisData?.usage);
      const stage1UsageLog = formatUsageLog(analysisData?.usage);
      console.log(`   Duration: ${stage1Duration}s | Tokens: ${stage1UsageLog}`);

      if (analysisResult.status === "rejected") {
        console.error(`[${requestId}] Stage 1 Failed:`, analysisResult.reason);
      }

      const userProfile = null;

      console.log(`\n[${requestId}] Status: Thinking...`);
      console.log(`   Model: ${config.stage3.modelName} (${config.stage3.reasoningEffort || "Ordinary"})`);
      controller.enqueue(encodeChunk({ type: "status", status: "thinking", keywords: [] }));

      const stage3Start = Date.now();
      let accumulatedThinking = "";
      let lastStatusTime = 0;
      let isGeneratingStatus = false;
      let hasLoggedThreshold = false;

      const strategyResult = await stage3Think(message, analysis, memory, config, effectiveToolPrompt, (chunk) => {
        accumulatedThinking += chunk;
        const now = Date.now();
        const elapsed = now - stage3Start;

        if (Math.random() < 0.1) {
          console.log(`[${requestId}] 棣冾潵 Receiving thinking chunk... (Total len: ${accumulatedThinking.length}, Elapsed: ${elapsed}ms)`);
        }

        if (elapsed > 4000) {
          if (!hasLoggedThreshold) {
            console.log(`[${requestId}] Passed 4s threshold. Starting status updates...`);
            hasLoggedThreshold = true;
          }

          if (!isGeneratingStatus && now - lastStatusTime > 6000) {
            console.log(`[${requestId}] Generating realtime thinking status... (Elapsed: ${elapsed}ms)`);
            isGeneratingStatus = true;
            const snippet = accumulatedThinking.slice(-1000);
            generateRealtimeStatus(snippet, config)
              .then((statusText) => {
                console.log(`[${requestId}] Generated Status: "${statusText}"`);
                try {
                  controller.enqueue(encodeChunk({ type: "status", status: "thinking", keywords: [statusText] }));
                } catch {}
                lastStatusTime = Date.now();
                isGeneratingStatus = false;
              })
              .catch((err) => {
                console.error(`[${requestId}] Realtime status generation failed:`, err);
                isGeneratingStatus = false;
              });
          }
        }
      });

      const stage3Duration = ((Date.now() - stage3Start) / 1000).toFixed(2);
      const strategy = strategyResult.strategy;
      applyUsage(tokenStats, strategyResult.usage);
      const stage3UsageLog = formatUsageLog(strategyResult.usage);
      console.log(`   Duration: ${stage3Duration}s | Tokens: ${stage3UsageLog}`);

      console.log(`\n[${requestId}] Status: Replying...`);
      console.log(`   Model: ${config.stage4.modelName}`);
      console.log(`   Style: ${partnerStyle === "empathetic" ? "Empathetic (Plan B)" : "Rational (Plan A)"}`);
      controller.enqueue(encodeChunk({ type: "status", status: "replying" }));

      const stage4Start = Date.now();
      const { aiReply, stage4Usage } = await generateFinalReply({
        message,
        toolId,
        partnerStyle,
        config,
        strategy,
        effectiveToolPrompt,
      });
      const stage4Duration = ((Date.now() - stage4Start) / 1000).toFixed(2);
      applyUsage(tokenStats, stage4Usage);
      const stage4UsageLog = formatUsageLog(stage4Usage);
      console.log(`   Duration: ${stage4Duration}s | Tokens: ${stage4UsageLog}`);

      const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n=== [${requestId}] Request Completed in ${totalDuration}s ===`);
      console.log(
        `Total Tokens: ${tokenStats.totalTokens} (In: ${tokenStats.inputTokens}, Out: ${tokenStats.outputTokens}, Cache: ${tokenStats.cacheHitTokens})`
      );

      const debugInfo = buildDebugInfo({
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
        tokenStats,
      });

      try {
        await saveMessageToDb(conversationId, "ai", "Full-Link Debug", "analysis", JSON.stringify(debugInfo));
        await saveMessageToDb(conversationId, "ai", aiReply, "text");

        const msgs = await getMessagesFromDb(conversationId, 10);
        if (msgs.length <= 2 && !toolTitle) {
          generateTitle(message, aiReply, config)
            .then((newTitle) => {
              if (newTitle) {
                console.log(`Updating title for ${conversationId} to: ${newTitle}`);
                void updateConversationTitle(conversationId, newTitle);
              }
            })
            .catch((err) => console.error("Async Title Gen Error:", err));
        }
      } catch (dbError) {
        console.error("DB Save Error (AI):", dbError);
      }

      const isSuperAdmin = user?.email === "14589960@qq.com";
      controller.enqueue(
        encodeChunk({
          type: "data",
          reply: aiReply,
          debug_info: isSuperAdmin ? debugInfo : undefined,
        })
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n[${requestId}] Request Completed in ${duration}s`);
      console.log(`   Tokens: ${tokenStats.totalTokens} (In: ${tokenStats.inputTokens}, Out: ${tokenStats.outputTokens})`);
      if (tokenStats.cacheHitTokens > 0) {
        console.log(`   Cache: Hit ${tokenStats.cacheHitTokens}, Miss ${tokenStats.cacheMissTokens}`);
      }
      console.log(`=== [${requestId}] End ===\n`);

      controller.close();
      setTimeout(
        () =>
          writeStatsSafely({
            requestId,
            statsIdentifier,
            statsType,
            message,
            toolId,
            tokenStats,
          }),
        0
      );
    } catch (error) {
      console.error(`[${requestId}] Streaming Error:`, error);
      controller.error(error);
    }
  }
}
