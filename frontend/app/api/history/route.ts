import { NextResponse } from "next/server";
import { getConversationsFromDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const userId = user ? user.id : null;

    const rows = await getConversationsFromDb(userId);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

