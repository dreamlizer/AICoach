import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const currentUser = getCurrentUser();
  if (!currentUser) return NextResponse.json({ user: null });

  try {
    const db = require("@/lib/db");
    const user = db.getDb().prepare("SELECT id, email, name, avatar FROM users WHERE id = ?").get(currentUser.id);
    
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
}
