import { NextResponse } from "next/server";
import { getWinlinezLeaderboard } from "@/lib/db";

export const dynamic = "force-dynamic";

function normalizeAidLevel(raw: string | null): "none" | "assist" | "boost" {
  if (raw === "assist" || raw === "boost") return raw;
  return "none";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const aidLevel = normalizeAidLevel(searchParams.get("aidLevel"));
    const limitRaw = Number(searchParams.get("limit") || 10);
    const limit = Math.max(1, Math.min(50, Number.isFinite(limitRaw) ? limitRaw : 10));

    const leaderboard = await getWinlinezLeaderboard(limit, aidLevel);
    return NextResponse.json({ leaderboard, aidLevel, limit });
  } catch (error) {
    console.error("Winlinez leaderboard fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch WINLINEZ leaderboard" }, { status: 500 });
  }
}

