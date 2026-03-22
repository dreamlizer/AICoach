import { NextResponse } from "next/server";
import { headers } from "next/headers";
import fs from "fs";
import path from "path";
import { 
  getRecentHistory, 
  stage1_analyze, 
  stage3Think, 
  stage4Reply, 
  generateTitle,
  generateRealtimeStatus
} from "@/lib/pipeline";
import { 
  getMessagesFromDb, 
  saveMessageToDb, 
  updateConversationTitle, 
  countUserMessages
} from "@/lib/db";
import { incrementTokenStats, getDailyMessageCount } from "@/lib/stats_db";
import {
  STAGE4_PROMPT,
  STAGE4_PROMPT_EMPATHETIC,
  getModelConfig,
  ModelProvider,
  ModelMode
} from "@/lib/stage_settings";
import { Stage1Analysis } from "@/lib/types";
import { getToolById } from "@/lib/tools_registry";
import { getToolKnowledgeBase } from "@/lib/knowledge_base";
import { getCurrentUser } from "@/lib/session";

// Helper to encode chunks for streaming
function encodeChunk(data: any): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

// Manual Environment Loader
function loadServerEnv() {
  const keys = {
    deepseek: process.env.DEEPSEEK_API_KEY || "",
    doubao: process.env.DOUBAO_API_KEY || ""
  };

  if (!keys.deepseek || !keys.doubao) {
    try {
      const envPath = path.resolve(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        content.split('\n').forEach(line => {
          const [k, ...v] = line.trim().split('=');
          if (!k || line.trim().startsWith('#')) return;
          const val = v.join('=').trim();
          if (k === 'DEEPSEEK_API_KEY' && !keys.deepseek) keys.deepseek = val;
          if (k === 'DOUBAO_API_KEY' && !keys.doubao) keys.doubao = val;
        });
      }
    } catch (e) {
      console.error("[EnvLoader] Failed to read local env:", e);
    }
  }
  return keys;
}

export class ChatService {
  static async handleRequest(request: Request) {
    try {
      const body = await request.json();
      const { message, conversationId, partnerStyle, toolId, toolTitle, modelProvider, mode } = body;

      // 1. Identity & Rate Limiting
      const headersList = headers();
      const forwardedFor = headersList.get("x-forwarded-for");
      const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : "unknown_ip";
      const user = getCurrentUser();
      const userId = user ? user.id : null;
      const statsIdentifier = userId ? `user:${userId}` : `ip:${ip}`;
      const statsType = userId ? 'user' : 'ip';

      if (!userId) {
        const userMsgCount = countUserMessages(conversationId);
        if (userMsgCount >= 2) {
          return NextResponse.json({ error: "Anonymous limit reached", code: "LIMIT_REACHED" }, { status: 403 });
        }
      } else {
        const dailyCount = getDailyMessageCount(statsIdentifier);
        if (dailyCount >= 100) {
          return NextResponse.json({ error: "Daily limit reached (100 messages)", code: "DAILY_LIMIT_REACHED" }, { status: 403 });
        }
      }

      // 2. Configuration
      const runtimeKeys = loadServerEnv();
      const config = getModelConfig(
        (modelProvider as ModelProvider) || "deepseek", 
        (mode as ModelMode) || "pro",
        runtimeKeys
      );

      if (!config.stage1.apiKey) {
          console.error("[CRITICAL] API Key is missing. Please check .env.local file.");
      }

      // 3. Save User Message
      try {
        saveMessageToDb(
          conversationId, "user", message, "text", null, userId,
          toolTitle, toolId
        );
      } catch (dbError) {
        console.error("DB Save Error (User):", dbError);
        return NextResponse.json({ error: "Failed to save message history", code: "DB_ERROR" }, { status: 500 });
      }

      // 4. Create Stream
      const stream = new ReadableStream({
        async start(controller) {
           await ChatService.streamLogic(controller, {
             message, conversationId, toolId, toolTitle, config, statsIdentifier, statsType, partnerStyle, userId, user
           });
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });

    } catch (error) {
      console.error("Chat Service Error:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  }

  private static async streamLogic(controller: ReadableStreamDefaultController, ctx: any) {
    const { message, conversationId, toolId, toolTitle, config, statsIdentifier, statsType, partnerStyle, userId, user } = ctx;
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);

    console.log(`\n=== [${requestId}] New Request Started ===`);
    console.log(`👤 User: ${statsIdentifier} (${statsType})`);
    console.log(`🤖 Provider: ${config.provider}`);
    console.log(`🛠️  Tool: ${toolTitle || "General Chat"} (${toolId || "none"})`);
    
    try {
      // Initial Status: Analyzing
      console.log(`\n[${requestId}] 🔍 Status: Analyzing...`);
      console.log(`   └─ Model: ${config.stage1.modelName}`);
      controller.enqueue(encodeChunk({ type: "status", status: "analyzing" }));

      // 2. Stage 2: Retrieve Memory
      const memory = getRecentHistory(conversationId);

      // 3. Parallel Processing: Stage 1 (Analysis) & Stage 2 (Memory)
      const tool = getToolById(toolId || undefined) || null;

      // Inject Knowledge Base if available for specific tools
      let effectiveToolPrompt = tool?.prompt;
      if (tool && tool.id === 'team-diagnosis') {
        const knowledgeBase = getToolKnowledgeBase(tool.id);
        if (knowledgeBase && effectiveToolPrompt) {
          effectiveToolPrompt += knowledgeBase;
        }
      }

      // Stats Accumulation
      let totalTokens = 0;
      let inputTokens = 0;
      let outputTokens = 0;
      let cacheHitTokens = 0;
      let cacheMissTokens = 0;

      const stage1Start = Date.now();
      let analysisPromise;
      if (effectiveToolPrompt) {
        analysisPromise = Promise.resolve({
          analysis: {
            intent: `tool_execution: ${tool?.name || toolId}`,
            sentiment: "neutral",
            complexity: "high",
            keywords: []
          } as Stage1Analysis,
          usage: undefined
        });
      } else {
        analysisPromise = stage1_analyze(message, config);
      }

      const [analysisResult] = await Promise.allSettled([analysisPromise]);

      const stage1End = Date.now();
      const stage1Duration = ((stage1End - stage1Start) / 1000).toFixed(2);
      
      const analysisData = analysisResult.status === "fulfilled" ? analysisResult.value : null;
      const analysis: Stage1Analysis = analysisData?.analysis || { 
            intent: "CHAT", 
            sentiment: "Unknown", 
            complexity: "LOW", 
            keywords: ["Error"] 
          };

      let stage1UsageLog = "N/A";
      if (analysisData?.usage) {
          totalTokens += analysisData.usage.total_tokens;
          inputTokens += analysisData.usage.prompt_tokens;
          outputTokens += analysisData.usage.completion_tokens;
          cacheHitTokens += (analysisData.usage.prompt_cache_hit_tokens || 0);
          cacheMissTokens += (analysisData.usage.prompt_cache_miss_tokens || 0);
          stage1UsageLog = `${analysisData.usage.total_tokens} (In: ${analysisData.usage.prompt_tokens}, Out: ${analysisData.usage.completion_tokens})`;
      }
      console.log(`   └─ ⏱️  Duration: ${stage1Duration}s | 🪙 Tokens: ${stage1UsageLog}`);

      if (analysisResult.status === "rejected") {
        console.error(`[${requestId}] ❌ Stage 1 Failed:`, analysisResult.reason);
      }
      
      const userProfile = null;

      // Transition to Thinking (Stage 3)
      console.log(`\n[${requestId}] 🧠 Status: Thinking...`);
      console.log(`   └─ Model: ${config.stage3.modelName} (${config.stage3.reasoningEffort || "Ordinary"})`);
      controller.enqueue(encodeChunk({ 
        type: "status", 
        status: "thinking",
        keywords: [] 
      }));

      // 4. Stage 3: Deep Thinking (Strategy)
      const stage3Start = Date.now();
      
      // Real-time Status Logic
      let accumulatedThinking = "";
      let lastStatusTime = 0;
      let isGeneratingStatus = false;
      let hasLoggedThreshold = false;

      const strategyResult = await stage3Think(
        message, 
        analysis, 
        memory, 
        config, 
        effectiveToolPrompt,
        (chunk) => {
            accumulatedThinking += chunk;
            const now = Date.now();
            const elapsed = now - stage3Start;
            
            // [Debug] Log chunk reception (throttled)
            if (Math.random() < 0.1) {
               console.log(`[${requestId}] 🧠 Receiving thinking chunk... (Total len: ${accumulatedThinking.length}, Elapsed: ${elapsed}ms)`);
            }

            // Rule: First 4s show static "Thinking", then rotate every 6s
            if (elapsed > 4000) {
                if (!hasLoggedThreshold) {
                    console.log(`[${requestId}] ⏱️ Passed 4s threshold. Starting status updates...`);
                    hasLoggedThreshold = true;
                }

                if (!isGeneratingStatus && (now - lastStatusTime > 6000)) {
                    console.log(`[${requestId}] 🚦 正在抓取实时思考状态 (Elapsed: ${elapsed}ms)...`);
                    isGeneratingStatus = true;
                    
                    // Use last 1000 chars for context
                    const snippet = accumulatedThinking.slice(-1000);
                    
                    generateRealtimeStatus(snippet, config)
                        .then(statusText => {
                            console.log(`[${requestId}] ✨ Generated Status: "${statusText}"`);
                            // Send update
                            try {
                              controller.enqueue(encodeChunk({ 
                                  type: "status", 
                                  status: "thinking", 
                                  keywords: [statusText] 
                              }));
                            } catch(e) {
                              // Controller might be closed
                            }
                            lastStatusTime = Date.now();
                            isGeneratingStatus = false;
                        })
                        .catch(err => {
                            console.error(`[${requestId}] ❌ Realtime status gen failed:`, err);
                            isGeneratingStatus = false;
                        });
                }
            }
        }
      );

      const stage3End = Date.now();
      const stage3Duration = ((stage3End - stage3Start) / 1000).toFixed(2);
      
      const strategy = strategyResult.strategy;
      
      let stage3UsageLog = "N/A";
      if (strategyResult.usage) {
          totalTokens += strategyResult.usage.total_tokens;
          inputTokens += strategyResult.usage.prompt_tokens;
          outputTokens += strategyResult.usage.completion_tokens;
          cacheHitTokens += (strategyResult.usage.prompt_cache_hit_tokens || 0);
          cacheMissTokens += (strategyResult.usage.prompt_cache_miss_tokens || 0);
          stage3UsageLog = `${strategyResult.usage.total_tokens} (In: ${strategyResult.usage.prompt_tokens}, Out: ${strategyResult.usage.completion_tokens})`;
      }
      console.log(`   └─ ⏱️  Duration: ${stage3Duration}s | 🪙 Tokens: ${stage3UsageLog}`);

      // Transition to Replying (Stage 4)
      console.log(`\n[${requestId}] 💬 Status: Replying...`);
      console.log(`   └─ Model: ${config.stage4.modelName}`);
      console.log(`   └─ Style: ${partnerStyle === "empathetic" ? "Empathetic (Plan B)" : "Rational (Plan A)"}`);
      controller.enqueue(encodeChunk({ type: "status", status: "replying" }));

      // 5. Stage 4: Expression (Final Reply)
      let aiReply = "";
      let stage4Usage: any = undefined;
      const stage4Start = Date.now();

      const { generateGrowCard, checkGrowTrigger } = await import("@/lib/grow_utils");
      
      const { isSample, isCard } = checkGrowTrigger(toolId, message);
      const isGrowCardRequest = isSample || isCard;

      if (isGrowCardRequest) {
          const growCardResult = await generateGrowCard(toolId, message, effectiveToolPrompt || "", config, strategy || undefined);
          if (growCardResult.html) {
              aiReply = growCardResult.html;
              stage4Usage = growCardResult.usage;
          } else {
              // Determine Prompt based on Partner Style
              const replyPromptTemplate = partnerStyle === "empathetic" ? STAGE4_PROMPT_EMPATHETIC : STAGE4_PROMPT;
              const finalPrompt = replyPromptTemplate.replace("{stage3_strategy}", strategy || "");

              const replyResult = strategy 
                ? await stage4Reply(strategy, config, finalPrompt, effectiveToolPrompt)
                : { reply: "抱歉，无法生成卡片。", usage: undefined };
              
              aiReply = replyResult.reply;
              stage4Usage = replyResult.usage;
          }
      } else {
          // Determine Prompt based on Partner Style
          const replyPromptTemplate = partnerStyle === "empathetic" ? STAGE4_PROMPT_EMPATHETIC : STAGE4_PROMPT;
          const finalPrompt = replyPromptTemplate.replace("{stage3_strategy}", strategy || "");

          const replyResult = strategy 
            ? await stage4Reply(strategy, config, finalPrompt, effectiveToolPrompt)
            : { reply: "抱歉，我今天状态不佳，无法进行思考。", usage: undefined };
            
          aiReply = replyResult.reply;
          stage4Usage = replyResult.usage;
      }

      const stage4End = Date.now();
      const stage4Duration = ((stage4End - stage4Start) / 1000).toFixed(2);
      
      let stage4UsageLog = "N/A";
      if (stage4Usage) {
          totalTokens += stage4Usage.total_tokens;
          inputTokens += stage4Usage.prompt_tokens;
          outputTokens += stage4Usage.completion_tokens;
          cacheHitTokens += (stage4Usage.prompt_cache_hit_tokens || 0);
          cacheMissTokens += (stage4Usage.prompt_cache_miss_tokens || 0);
          stage4UsageLog = `${stage4Usage.total_tokens} (In: ${stage4Usage.prompt_tokens}, Out: ${stage4Usage.completion_tokens})`;
      }
      console.log(`   └─ ⏱️  Duration: ${stage4Duration}s | 🪙 Tokens: ${stage4UsageLog}`);

      const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n=== [${requestId}] Request Completed in ${totalDuration}s ===`);
      console.log(`📊 Total Tokens: ${totalTokens} (In: ${inputTokens}, Out: ${outputTokens}, Cache: ${cacheHitTokens})`);

      // Update Stats
      incrementTokenStats(
        statsIdentifier,
        statsType,
        totalTokens,
        inputTokens,
        outputTokens,
        cacheHitTokens,
        cacheMissTokens,
        message ? message.length : 0,
        toolId || null
      );

      // 6. Construct Response
      const debugInfo = {
          config_provider: config.provider,
          model_info: {
               stage1: config.stage1.modelName,
               stage3: `${config.stage3.modelName} (${config.stage3.reasoningEffort || "Ordinary"})`,
               stage4: `${config.stage4.modelName} [Prompt: ${partnerStyle === "empathetic" ? "Plan B (感性伙伴)" : "Plan A (理性参谋)"}]`
          },
          stage1: analysis,
          stage2_memory: memory || "无历史记忆",
          stage3_strategy: strategy || "策略生成失败",
          stage5_profile: userProfile || "画像更新失败或无变化",
          stats: {
              stage1: { duration: `${stage1Duration}s`, tokens: stage1UsageLog },
              stage3: { duration: `${stage3Duration}s`, tokens: stage3UsageLog },
              stage4: { duration: `${stage4Duration}s`, tokens: stage4UsageLog },
              total: { 
                  duration: `${totalDuration}s`, 
                  tokens: `${totalTokens} (In: ${inputTokens}, Out: ${outputTokens})` 
              }
          }
      };

      // Save to DB (Async)
      try {
        saveMessageToDb(
          conversationId, 
          "ai", 
          "Full-Link Debug", 
          "analysis", 
          JSON.stringify(debugInfo)
        );

        saveMessageToDb(conversationId, "ai", aiReply, "text");

        const msgs = getMessagesFromDb(conversationId, 10);
        if (msgs.length <= 2 && !toolTitle) {
           generateTitle(message, aiReply, config).then(newTitle => {
              if (newTitle) {
                 console.log(`Updating title for ${conversationId} to: ${newTitle}`);
                 updateConversationTitle(conversationId, newTitle);
              }
           }).catch(err => console.error("Async Title Gen Error:", err));
        }
      } catch (dbError) {
        console.error("DB Save Error (AI):", dbError);
      }

      // Send Final Data
      // Security: Only send debug_info to Super Admin
      const isSuperAdmin = user?.email === "14589960@qq.com";
      
      controller.enqueue(encodeChunk({ 
        type: "data", 
        reply: aiReply,
        debug_info: isSuperAdmin ? debugInfo : undefined
      }));
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n[${requestId}] ✅ Request Completed in ${duration}s`);
      console.log(`   └─ Tokens: ${totalTokens} (In: ${inputTokens}, Out: ${outputTokens})`);
      if (cacheHitTokens > 0) {
         console.log(`   └─ Cache: Hit ${cacheHitTokens}, Miss ${cacheMissTokens}`);
      }
      console.log(`=== [${requestId}] End ===\n`);

      controller.close();
    } catch (error) {
      console.error(`[${requestId}] ❌ Streaming Error:`, error);
      controller.error(error);
    }
  }
}
