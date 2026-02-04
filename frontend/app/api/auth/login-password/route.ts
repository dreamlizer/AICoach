import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 });
    }

    // Get User
    const user = getUserByEmail(email) as any;
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 400 });
    }

    // Check Password
    if (!user.password_hash) {
       return NextResponse.json({ error: "该用户未设置密码，请使用验证码登录或重置密码" }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
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
    console.error("Login Password Error:", error);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
