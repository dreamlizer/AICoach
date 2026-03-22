import { NextResponse } from "next/server";
import { searchMessages } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Authenticate user
    let userId: number | null = null;

    const currentUser = getCurrentUser();
    if (currentUser) userId = Number(currentUser.id);

    const rawResults = searchMessages(query, userId);

    // Process results to create snippets
    const results = rawResults.map((row) => {
      // Create a snippet around the matching keyword
      // If title matches but content doesn't, just take the beginning
      // If content matches, try to center around the match
      
      const content = row.content;
      const lowerContent = content.toLowerCase();
      const lowerQuery = query.toLowerCase();
      const matchIndex = lowerContent.indexOf(lowerQuery);

      let snippet = "";
      if (matchIndex === -1) {
        // Match likely in title, return start of content
        snippet = content.slice(0, 100) + (content.length > 100 ? "..." : "");
      } else {
        // Match in content, try to context
        const start = Math.max(0, matchIndex - 30);
        const end = Math.min(content.length, matchIndex + query.length + 70);
        snippet = (start > 0 ? "..." : "") + content.slice(start, end) + (end < content.length ? "..." : "");
      }

      return {
        id: row.message_id,
        conversationId: row.conversation_id,
        title: row.conversation_title,
        snippet: snippet,
        date: new Date(row.created_at).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
        timestamp: row.created_at // Keep full timestamp for sorting if needed
      };
    });

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Search Error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
