import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/stats_db";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const stats = getDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Stats JSON Error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
