import { NextResponse } from "next/server";
import { stage1_analyze, getRecentHistory, stage3Think, stage4Reply, stage5Profile } from "@/lib/pipeline";
import { saveMessageToDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { message, conversationId } = await request.json();

    if (!message || !conversationId) {
      return NextResponse.json(
        { error: "Message and conversationId are required" },
        { status: 400 }
      );
    }

    // 1. Save User Message to DB
    try {
      saveMessageToDb(conversationId, "user", message);
    } catch (dbError) {
      console.error("DB Save Error (User):", dbError);
      // Continue execution even if DB save fails, to provide reply
    }

    // 2. Stage 2: Retrieve Memory
    const memory = getRecentHistory(conversationId);

    // Parallel Execution: Stage 1 (Analysis) & Stage 5 (Profile)
    // Use Promise.allSettled to ensure one failure doesn't stop the other
    const [analysisResult, profileResult] = await Promise.allSettled([
      stage1_analyze(message),
      stage5Profile(memory)
    ]);

    // Handle Stage 1 Result
    const analysis = analysisResult.status === "fulfilled" 
      ? analysisResult.value 
      : { 
          intent: "CHAT", 
          sentiment: "Unknown", 
          complexity: "LOW", 
          keywords: ["Error"] 
        }; // Fallback analysis

    if (analysisResult.status === "rejected") {
      console.error("Stage 1 Failed:", analysisResult.reason);
    }

    // Handle Stage 5 Result
    const userProfile = profileResult.status === "fulfilled" 
      ? profileResult.value 
      : null;

    if (profileResult.status === "rejected") {
      console.error("Stage 5 Failed:", profileResult.reason);
    }

    // 4. Stage 3: Deep Thinking (Strategy)
    const strategy = await stage3Think(message, analysis, memory);

    // 5. Stage 4: Expression (Final Reply)
    const aiReply = strategy 
      ? await stage4Reply(strategy)
      : "抱歉，我今天状态不佳，无法进行思考。";

    // 6. Construct Response
    try {
      saveMessageToDb(conversationId, "ai", aiReply);
    } catch (dbError) {
      console.error("DB Save Error (AI):", dbError);
    }

    return NextResponse.json({
      reply: aiReply,
      debug_info: {
        stage1: analysis,
        stage2_memory: memory || "无历史记忆",
        stage3_strategy: strategy || "策略生成失败",
        stage5_profile: userProfile || "画像更新失败或无变化"
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
