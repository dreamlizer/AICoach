import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db";
import bcrypt from "bcryptjs";
import { checkLoginRateLimit, handleLoginSuccess, handleLoginFailure } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 });
    }

    const rateLimitError = checkLoginRateLimit(email);
    if (rateLimitError) return rateLimitError;

    const user = getUserByEmail(email) as any;
    if (!user) {
      return handleLoginFailure(email, "邮箱或密码错误");
    }

    if (!user.password_hash) {
      return handleLoginFailure(email, "邮箱或密码错误");
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return handleLoginFailure(email, "邮箱或密码错误");
    }

    return handleLoginSuccess(user);
  } catch (error) {
    console.error("Login Password Error:", error);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
