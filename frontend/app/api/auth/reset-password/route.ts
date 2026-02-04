import { NextResponse } from "next/server";
import { verifyCode, getUserByEmail, updateUserPassword } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, code, newPassword } = await request.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "所有字段都必须填写" }, { status: 400 });
    }

    // Verify Code
    const isValid = verifyCode(email, code);
    if (!isValid) {
      return NextResponse.json({ error: "验证码无效或已过期" }, { status: 400 });
    }

    // Get User
    const user = getUserByEmail(email) as any;
    if (!user) {
        return NextResponse.json({ error: "用户不存在" }, { status: 400 });
    }

    // Update Password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    updateUserPassword(user.id, passwordHash);

    return NextResponse.json({ success: true, message: "密码重置成功" });
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    return NextResponse.json({ error: error.message || "重置密码失败" }, { status: 500 });
  }
}
