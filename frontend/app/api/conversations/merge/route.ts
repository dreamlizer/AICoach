import { NextResponse } from "next/server";
import { claimConversationForUser } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await claimConversationForUser(conversationId, user.id);

    if (result.status === "not_found") {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (result.status === "claimed_by_other") {
      return NextResponse.json({ error: "Conversation already claimed" }, { status: 403 });
    }

    if (result.status === "already_claimed") {
      return NextResponse.json({ success: true, message: "Already merged" });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Merge Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
