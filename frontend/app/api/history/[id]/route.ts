﻿﻿﻿﻿﻿import { NextResponse } from "next/server";
import { getMessagesFromDb, deleteConversation, getConversationById, resolveConversationId } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conversationId = (await resolveConversationId(id)) || id;

  const user = await getCurrentUser();
  const conversation = await getConversationById(conversationId);

  if (conversation && conversation.user_id && (!user || user.id !== conversation.user_id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await deleteConversation(conversationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete conversation:", error);
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conversationId = (await resolveConversationId(id)) || id;

  const user = await getCurrentUser();
  const conversation = await getConversationById(conversationId);

  if (conversation && conversation.user_id && (!user || user.id !== conversation.user_id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const rawMessages = await getMessagesFromDb(conversationId, 100);

    const messages = rawMessages.map((msg) => {
      let debugInfo = undefined;
      if (msg.metadata) {
        try {
          debugInfo = JSON.parse(msg.metadata);
        } catch (e) {
          console.error(`Failed to parse metadata for message ${msg.id}`, e);
        }
      }
      return {
        ...msg,
        debugInfo,
      };
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Failed to fetch history details:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

