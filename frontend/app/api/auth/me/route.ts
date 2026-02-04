import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret";

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token");

  if (!token) {
    return NextResponse.json({ user: null });
  }

  try {
    const decoded = jwt.verify(token.value, JWT_SECRET) as any;
    const db = require("@/lib/db");
    // Get full user details from DB to ensure fresh data
    const user = db.getDb().prepare("SELECT id, email, name, avatar FROM users WHERE id = ?").get(decoded.userId);
    
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
}
