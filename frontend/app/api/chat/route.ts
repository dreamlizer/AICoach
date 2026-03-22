import { ChatService } from "@/lib/chat_service";

export const dynamic = 'force-dynamic'; // Prevent static optimization

export async function POST(request: Request) {
  return ChatService.handleRequest(request);
}
