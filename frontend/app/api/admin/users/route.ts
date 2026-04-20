import { NextResponse } from "next/server";
import { listUsersForAdmin } from "@/lib/db";
import { requireAdmin } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const users = await listUsersForAdmin();
    return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
  } catch (error) {
    console.error("Admin Users Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}
