import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/stats_db";
import { requireAdmin } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const stats = getDashboardStats();
    return NextResponse.json(stats, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
  } catch (error) {
    console.error("Stats JSON Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}
