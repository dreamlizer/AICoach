import { NextResponse } from "next/server";
import { createConversation, updateConversationTitle, updateConversationTool } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { conversationId, title, toolId } = await request.json();

    if (!conversationId || !title) {
      return NextResponse.json(
        { error: "conversationId and title are required" },
        { status: 400 }
      );
    }

    createConversation(conversationId, title, toolId || null);
    updateConversationTitle(conversationId, title);
    updateConversationTool(conversationId, toolId || null);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Create conversation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
