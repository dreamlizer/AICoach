import { NextResponse } from "next/server";
import { getUserStats, getAnalyticsEvents } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");
    const type = searchParams.get("type") || "stats"; // 'stats' or 'events'
    const limit = parseInt(searchParams.get("limit") || "50");

    // Security Check: In a real app, you MUST check if the current user is an Admin.
    // For this demo/local version, we assume access is allowed or we just check if user is logged in.
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Allow viewing own stats, or if "admin" (logic to be implemented)
    // For now, we allow any logged-in user to view stats if they provide a userId, 
    // or view their own if no userId provided.
    const queryUserId = targetUserId ? parseInt(targetUserId) : currentUser.id;

    if (type === "events") {
      const events = getAnalyticsEvents(limit, queryUserId);
      return NextResponse.json({ events });
    } else {
      const stats = getUserStats(queryUserId);
      return NextResponse.json({ stats });
    }
  } catch (error) {
    console.error("Stats API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
