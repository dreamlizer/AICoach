import { NextResponse } from "next/server";
import { verifyCode, getUserByEmail } from "@/lib/db";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret";

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: "邮箱和验证码不能为空" }, { status: 400 });
    }

    // Verify Code
    const isValid = verifyCode(email, code);
    if (!isValid) {
      return NextResponse.json({ error: "验证码无效或已过期" }, { status: 400 });
    }

    // Get User
    const user = getUserByEmail(email) as any;
    
    if (!user) {
      return NextResponse.json({ error: "用户不存在，请先注册" }, { status: 400 });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" } // Token valid for 7 days
    );

    // Set Cookie
    const cookie = serialize("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      sameSite: "strict",
    });

    const response = NextResponse.json({ success: true, user });
    response.headers.set("Set-Cookie", cookie);

    return response;
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
