import { NextResponse } from "next/server";
import { getUserStats, getAnalyticsEvents } from "@/lib/db";
import { requireAdmin } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");
    const type = searchParams.get("type") || "stats";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const queryUserId = targetUserId ? parseInt(targetUserId, 10) : admin.user.id;

    if (!Number.isFinite(queryUserId) || queryUserId <= 0) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    if (type === "events") {
      const events = getAnalyticsEvents(limit, queryUserId);
      return NextResponse.json({ events }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
    }

    const stats = getUserStats(queryUserId);
    return NextResponse.json({ stats }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
  } catch (error) {
    console.error("Stats API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}
