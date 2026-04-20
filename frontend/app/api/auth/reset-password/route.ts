import { NextResponse } from "next/server";
import { verifyCode, getUserByEmail, updateUserPassword } from "@/lib/db";
import { validatePassword } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, code, newPassword } = await request.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const isValid = await verifyCode(email, code);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(user.id, passwordHash);

    return NextResponse.json({ success: true, message: "Password reset successfully" });
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    return NextResponse.json({ error: error.message || "Password reset failed" }, { status: 500 });
  }
}
