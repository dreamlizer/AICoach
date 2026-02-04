import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { updateUserProfile } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token.value, JWT_SECRET) as any;
    const { name, avatar } = await request.json();

    const updatedUser = updateUserProfile(decoded.userId, { name, avatar });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
