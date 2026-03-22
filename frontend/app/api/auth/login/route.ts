import { NextResponse } from "next/server";
import { verifyCode, getUserByEmail } from "@/lib/db";
import { checkLoginRateLimit, handleLoginSuccess, handleLoginFailure } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: "邮箱和验证码不能为空" }, { status: 400 });
    }

    const rateLimitError = checkLoginRateLimit(email);
    if (rateLimitError) return rateLimitError;

    const isValid = verifyCode(email, code);
    if (!isValid) {
      return handleLoginFailure(email, "邮箱或验证码错误");
    }

    const user = getUserByEmail(email) as any;
    
    if (!user) {
      return handleLoginFailure(email, "邮箱或验证码错误");
    }

    return handleLoginSuccess(user);
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
