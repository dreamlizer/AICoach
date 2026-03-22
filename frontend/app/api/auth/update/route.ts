import { NextResponse } from "next/server";
import { updateUserProfile } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { name, avatar } = await request.json();

    const updatedUser = updateUserProfile(currentUser.id, { name, avatar });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
