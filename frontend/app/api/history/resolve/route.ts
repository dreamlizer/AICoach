import { NextResponse } from "next/server";
import { resolveConversationId, getConversationById } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("c") || "").trim();
  if (!code) return NextResponse.json({ error: "Missing c" }, { status: 400 });
  const resolvedId = resolveConversationId(code);
  if (!resolvedId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const conversation = getConversationById(resolvedId);
  const user = getCurrentUser();
  if (conversation && conversation.user_id && (!user || user.id !== conversation.user_id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  return NextResponse.json({
    id: resolvedId,
    shortCode: conversation?.short_code || null
  });
}
