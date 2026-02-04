import { NextResponse } from "next/server";
import { stage1_analyze, getRecentHistory, stage3Think, stage4Reply, stage5Profile, generateTitle } from "@/lib/pipeline";
import { saveMessageToDb, updateConversationTitle, updateConversationTool, getMessagesFromDb, countUserMessages } from "@/lib/db";
import { executiveTools } from "@/lib/executive_tools";
import { Stage1Analysis } from "@/lib/types";
import { buildGrowCardHtml, GrowCardPayload, SAMPLE_CASE, FALLBACK_PAYLOAD } from "@/lib/templates";
import { cleanJsonBlock } from "@/lib/utils";
import { getToolKnowledgeBase } from "@/lib/knowledge_base";
import { getModelConfig, ModelProvider } from "@/lib/stage_settings";
import { getCurrentUser } from "@/lib/session";
import fs from "fs";
import path from "path";

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
      const logEntry = `[${new Date().toISOString()}] ConvID: ${conversationId}, UserID: ${userId}, MsgCount: ${userMsgCount}, Limit: 6\n`;
      fs.appendFileSync(logPath, logEntry);
    } catch (e) {
      console.error("Logging failed:", e);
    }

    // Check Anonymous Limit (6 exchanges)
    if (!userId) {
      const userMsgCount = countUserMessages(conversationId);
      if (userMsgCount >= 6) {
        return NextResponse.json(
          { error: "Anonymous limit reached", code: "LIMIT_REACHED" },
          { status: 403 }
        );
      }
    }

    // Get Dynamic Configuration based on user selection
    const config = getModelConfig((modelProvider as ModelProvider) || "deepseek", partnerStyle);

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
      
      // Legacy update block removed as saveMessageToDb now handles initialization
    } catch (dbError) {
      console.error("DB Save Error (User):", dbError);
      // Critical Error: If we can't save the message, we shouldn't proceed.
      // Otherwise, context is lost and limits are bypassed.
      return NextResponse.json(
        { error: "Failed to save message history", code: "DB_ERROR" },
        { status: 500 }
      );
    }

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

    // Optimization: If a specific tool is active, we SKIP Stage 1 Analysis.
    // The tool's specialized prompt (Stage 3/4) is sufficient and more accurate.
    let analysisPromise;
    if (effectiveToolPrompt) {
      // Create a dummy analysis result for tool mode to satisfy type/debug requirements
      analysisPromise = Promise.resolve({
        intent: "tool_execution",
        sentiment: "neutral",
        complexity: "high",
        keywords: []
      } as Stage1Analysis);
    } else {
      analysisPromise = stage1_analyze(message, config);
    }

    const [analysisResult] = await Promise.allSettled([
      analysisPromise
    ]);

    // Handle Stage 1 Result
    const analysis: Stage1Analysis = analysisResult.status === "fulfilled" 
      ? analysisResult.value 
      : { 
          intent: "CHAT", 
          sentiment: "Unknown", 
          complexity: "LOW", 
          keywords: ["Error"] 
        };

    if (analysisResult.status === "rejected") {
      console.error("Stage 1 Failed:", analysisResult.reason);
    }
    
    // Stage 5 Profile Removed (Optimization)
    const userProfile = null;

    // 4. Stage 3: Deep Thinking (Strategy)
    const strategy = await stage3Think(message, analysis, memory, config, effectiveToolPrompt);

    // 5. Stage 4: Expression (Final Reply)
    let aiReply = "";

    // Refactored: Use helper for GROW card generation
    const { generateGrowCard, checkGrowTrigger } = await import("@/lib/grow_utils");
    
    // Check if we should generate a card (using shared logic)
    const { isSample, isCard } = checkGrowTrigger(toolId, message);
    const isGrowCardRequest = isSample || isCard;

    if (isGrowCardRequest) {
        const growCardHtml = await generateGrowCard(toolId, message, effectiveToolPrompt || "", config, strategy);
        if (growCardHtml) {
            aiReply = growCardHtml;
        } else {
            // Fallback if card generation fails
            aiReply = strategy 
              ? await stage4Reply(strategy, config, undefined, effectiveToolPrompt)
              : "抱歉，无法生成卡片。";
        }
    } else {
        // Standard Text Reply
        aiReply = strategy 
          ? await stage4Reply(strategy, config, undefined, effectiveToolPrompt)
          : "抱歉，我今天状态不佳，无法进行思考。";
    }

    // 6. Construct Response
    const debugInfo = {
        config_provider: config.provider,
        model_info: {
             stage1: config.stage1.modelName,
             stage3: `${config.stage3.modelName} (${config.stage3.reasoningEffort || "Ordinary"})`,
             stage4: config.stage4.modelName
        },
        stage1: analysis,
        stage2_memory: memory || "无历史记忆",
        stage3_strategy: strategy || "策略生成失败",
        stage5_profile: userProfile || "画像更新失败或无变化"
    };

    try {
      // Save Analysis Process (Analysis) - Saved FIRST to appear before text in history
      saveMessageToDb(
        conversationId, 
        "ai", 
        "Full-Link Debug", 
        "analysis", 
        JSON.stringify(debugInfo)
      );

      // Save AI Reply (Text)
      saveMessageToDb(conversationId, "ai", aiReply, "text");

      // Async Title Generation Optimization
      // Only generate if it's the first exchange (message count <= 2)
      // We can check DB or just assume if we want to update titles periodically.
      // For efficiency, let's just do it for short conversations or explicitly when it's new.
      // Since we don't know if it's new easily without querying, let's query quickly.
      const msgs = getMessagesFromDb(conversationId, 10);
      if (msgs.length <= 2 && !toolTitle) {
         // Fire and forget - don't await
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

    return NextResponse.json({
      reply: aiReply,
      debug_info: debugInfo
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
