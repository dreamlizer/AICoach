import { NextResponse } from "next/server";
import { listUsersForAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = listUsersForAdmin();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Admin Users Error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
