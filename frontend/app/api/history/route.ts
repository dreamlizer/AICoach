import { NextResponse } from "next/server";
import { getConversationsFromDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = getConversationsFromDb();
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
