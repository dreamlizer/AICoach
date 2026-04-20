import { NextResponse } from "next/server";
import { getUserById, updateUserPassword } from "@/lib/db";
import { getCurrentUser, validatePassword } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "Old password and new password are required" }, { status: 400 });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRecord = await getUserById(user.id);

    if (!userRecord || !userRecord.password_hash) {
      return NextResponse.json({ error: "Current user has no password set" }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(oldPassword, userRecord.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: "Old password is incorrect" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(user.id, hashedPassword);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update Password Error:", error);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}

