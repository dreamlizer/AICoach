import { NextResponse } from "next/server";
import { getMessagesFromDb, deleteConversation, getConversationById } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const conversationId = params.id;
  
  // Check ownership
  const user = getCurrentUser();
  const conversation = getConversationById(conversationId);
  
  if (conversation && conversation.user_id && (!user || user.id !== conversation.user_id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    deleteConversation(conversationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete conversation:", error);
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const conversationId = params.id;
  
  // Check ownership
  const user = getCurrentUser();
  const conversation = getConversationById(conversationId);
  
  if (conversation && conversation.user_id && (!user || user.id !== conversation.user_id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // 100 is a reasonable limit for now to load full history of a session
    const rawMessages = getMessagesFromDb(conversationId, 100); 
    
    // Map DB format to UI format: Parse metadata string -> debugInfo object
    const messages = rawMessages.map(msg => {
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
        debugInfo
      };
    });
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Failed to fetch history details:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
