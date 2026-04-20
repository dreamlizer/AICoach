import { NextResponse } from "next/server";
import { updateUserProfile } from "@/lib/db";
import { sanitizeUser } from "@/lib/auth-helpers";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, avatar } = await request.json();
    const updatedUser = await updateUserProfile(currentUser.id, { name, avatar });

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: sanitizeUser(updatedUser) });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

