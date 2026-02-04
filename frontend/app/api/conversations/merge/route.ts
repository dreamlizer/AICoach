import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
    }

    const user = getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    
    // Check if conversation exists and is anonymous
    const conversation = db.prepare("SELECT * FROM conversations WHERE id = ?").get(conversationId) as any;

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conversation.user_id && conversation.user_id !== user.id) {
       // Already belongs to someone else
       return NextResponse.json({ error: "Conversation already claimed" }, { status: 403 });
    }

    if (conversation.user_id === user.id) {
      // Already belongs to current user
      return NextResponse.json({ success: true, message: "Already merged" });
    }

    // Merge: Update user_id
    db.prepare("UPDATE conversations SET user_id = ? WHERE id = ?").run(user.id, conversationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Merge Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
