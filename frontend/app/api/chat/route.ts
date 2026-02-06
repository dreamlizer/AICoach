import { NextResponse } from "next/server";
import { stage1_analyze, getRecentHistory, stage3Think, stage4Reply, generateTitle } from "@/lib/pipeline";
import { saveMessageToDb, updateConversationTitle, updateConversationTool, getMessagesFromDb, countUserMessages, getConversationsFromDb, incrementUserTokens, incrementToolUsage, trackEvent } from "@/lib/db";
import { executiveTools } from "@/lib/executive_tools";
import { Stage1Analysis } from "@/lib/types";
import { buildGrowCardHtml, GrowCardPayload, SAMPLE_CASE, FALLBACK_PAYLOAD } from "@/lib/templates/index";
import { cleanJsonBlock } from "@/lib/utils";
import { getToolKnowledgeBase } from "@/lib/knowledge_base";
import { getModelConfig, ModelProvider, STAGE4_PROMPT, STAGE4_PROMPT_EMPATHETIC } from "@/lib/stage_settings";
import { getCurrentUser } from "@/lib/session";
import fs from "fs";
import path from "path";

// Helper to encode streaming data
function encodeChunk(data: any) {
  return new TextEncoder().encode(JSON.stringify(data) + "\n");
}

export async function POST(request: Request) {
  try {
    const { message, conversationId, toolId, toolTitle, modelProvider, partnerStyle } = await request.json();

    if (!message || !conversationId) {
      return NextResponse.json(
        { error: "Message and conversationId are required" },
        { status: 400 }
      );
    }

    // Get Current User
    const user = getCurrentUser();
    const userId = user ? user.id : null;

    // Debug Logging
    try {
      const logPath = path.join(process.cwd(), "debug_chat_limit.txt");
      const userMsgCount = countUserMessages(conversationId);
      const logEntry = `[${new Date().toISOString()}] ConvID: ${conversationId}, UserID: ${userId}, MsgCount: ${userMsgCount}, Limit: 2\n`;
      fs.appendFileSync(logPath, logEntry);
    } catch (e) {
      console.error("Logging failed:", e);
    }

    // Check Anonymous Limit (4 exchanges: 2 user messages)
    if (!userId) {
      const userMsgCount = countUserMessages(conversationId);
      if (userMsgCount >= 2) {
        return NextResponse.json(
          { error: "Anonymous limit reached", code: "LIMIT_REACHED" },
          { status: 403 }
        );
      }
    }

    // Get Dynamic Configuration based on user selection
    const config = getModelConfig((modelProvider as ModelProvider) || "deepseek");

    // 1. Save User Message to DB
    try {
      saveMessageToDb(
        conversationId, 
        "user", 
        message, 
        "text", 
        null, 
        userId,
        toolTitle, // Pass initial title (if any)
        toolId     // Pass initial tool ID (if any)
      );
    } catch (dbError) {
      console.error("DB Save Error (User):", dbError);
      return NextResponse.json(
        { error: "Failed to save message history", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    // Create a Streaming Response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Initial Status: Analyzing
          controller.enqueue(encodeChunk({ type: "status", status: "analyzing" }));

          // 2. Stage 2: Retrieve Memory
          const memory = getRecentHistory(conversationId);

          // 3. Parallel Processing: Stage 1 (Analysis) & Stage 2 (Memory)
          const tool = toolId ? executiveTools.find((item) => item.id === toolId) : null;

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

          let analysisPromise;
          if (effectiveToolPrompt) {
            analysisPromise = Promise.resolve({
              analysis: {
                intent: "tool_execution",
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

          const analysisData = analysisResult.status === "fulfilled" 
            ? analysisResult.value 
            : null;
            
          const analysis: Stage1Analysis = analysisData?.analysis || { 
                intent: "CHAT", 
                sentiment: "Unknown", 
                complexity: "LOW", 
                keywords: ["Error"] 
              };

          if (analysisData?.usage) {
              totalTokens += analysisData.usage.total_tokens;
              inputTokens += analysisData.usage.prompt_tokens;
              outputTokens += analysisData.usage.completion_tokens;
          }

          if (analysisResult.status === "rejected") {
            console.error("Stage 1 Failed:", analysisResult.reason);
          }
          
          const userProfile = null;

          // Transition to Thinking (Stage 3)
          controller.enqueue(encodeChunk({ type: "status", status: "thinking" }));

          // 4. Stage 3: Deep Thinking (Strategy)
          const strategyResult = await stage3Think(message, analysis, memory, config, effectiveToolPrompt);
          const strategy = strategyResult.strategy;
          
          if (strategyResult.usage) {
              totalTokens += strategyResult.usage.total_tokens;
              inputTokens += strategyResult.usage.prompt_tokens;
              outputTokens += strategyResult.usage.completion_tokens;
          }

          // Transition to Replying (Stage 4)
          controller.enqueue(encodeChunk({ type: "status", status: "replying" }));

          // 5. Stage 4: Expression (Final Reply)
          let aiReply = "";

          const { generateGrowCard, checkGrowTrigger } = await import("@/lib/grow_utils");
          
          const { isSample, isCard } = checkGrowTrigger(toolId, message);
          const isGrowCardRequest = isSample || isCard;

          if (isGrowCardRequest) {
              const growCardResult = await generateGrowCard(toolId, message, effectiveToolPrompt || "", config, strategy || undefined);
              if (growCardResult.html) {
                  aiReply = growCardResult.html;
                  if (growCardResult.usage) {
                      totalTokens += growCardResult.usage.total_tokens;
                      inputTokens += growCardResult.usage.prompt_tokens;
                      outputTokens += growCardResult.usage.completion_tokens;
                  }
              } else {
                  // Determine Prompt based on Partner Style
                  const replyPromptTemplate = partnerStyle === "empathetic" ? STAGE4_PROMPT_EMPATHETIC : STAGE4_PROMPT;
                  const finalPrompt = replyPromptTemplate.replace("{stage3_strategy}", strategy || "");

                  const replyResult = strategy 
                    ? await stage4Reply(strategy, config, finalPrompt, effectiveToolPrompt)
                    : { reply: "抱歉，无法生成卡片。" };
                  
                  aiReply = replyResult.reply;
                  if (replyResult.usage) {
                      totalTokens += replyResult.usage.total_tokens;
                      inputTokens += replyResult.usage.prompt_tokens;
                      outputTokens += replyResult.usage.completion_tokens;
                  }
              }
          } else {
              // Determine Prompt based on Partner Style
              const replyPromptTemplate = partnerStyle === "empathetic" ? STAGE4_PROMPT_EMPATHETIC : STAGE4_PROMPT;
              const finalPrompt = replyPromptTemplate.replace("{stage3_strategy}", strategy || "");

              const replyResult = strategy 
                ? await stage4Reply(strategy, config, finalPrompt, effectiveToolPrompt)
                : { reply: "抱歉，我今天状态不佳，无法进行思考。" };
                
              aiReply = replyResult.reply;
              if (replyResult.usage) {
                  totalTokens += replyResult.usage.total_tokens;
                  inputTokens += replyResult.usage.prompt_tokens;
                  outputTokens += replyResult.usage.completion_tokens;
              }
          }

          // Update Stats
          if (userId) {
              incrementUserTokens(userId, totalTokens, inputTokens, outputTokens);
              if (toolId) {
                  incrementToolUsage(userId, toolId);
              }

              // Example of using generic event tracking for advanced analytics without schema change
              trackEvent(userId, "chat_completed", "chat", {
                  conversation_id: conversationId,
                  tool_id: toolId || "none",
                  tokens: { total: totalTokens, input: inputTokens, output: outputTokens },
                  model: config.provider, // Track which model provider was used
                  has_card: !!isGrowCardRequest
              });
          }

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
              stage5_profile: userProfile || "画像更新失败或无变化"
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
          
          controller.close();
        } catch (error) {
          console.error("Streaming Error:", error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked"
      }
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
