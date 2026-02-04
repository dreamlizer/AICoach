import { NextResponse } from "next/server";
import { verifyCode, createUserWithPassword, getUserByEmail } from "@/lib/db";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret";

export async function POST(request: Request) {
  try {
    const { email, code, password, name } = await request.json();

    if (!email || !code || !password || !name) {
      return NextResponse.json({ error: "所有字段都必须填写" }, { status: 400 });
    }

    // Verify Code
    const isValid = verifyCode(email, code);
    if (!isValid) {
      return NextResponse.json({ error: "验证码无效或已过期" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = getUserByEmail(email);
    if (existingUser) {
        return NextResponse.json({ error: "该邮箱已被注册" }, { status: 400 });
    }

    // Hash Password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create User
    const user = createUserWithPassword(email, passwordHash, name);

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
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: error.message || "注册失败" }, { status: 500 });
  }
}
