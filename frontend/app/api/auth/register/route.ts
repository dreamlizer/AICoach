import { NextResponse } from "next/server";
import { verifyCode, createUserWithPassword, getUserByEmail } from "@/lib/db";
import { createAuthCookie, validatePassword } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, code, password, name } = await request.json();

    if (!email || !code || !password || !name) {
      return NextResponse.json({ error: "所有字段都必须填写" }, { status: 400 });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
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

    const passwordHash = await bcrypt.hash(password, 10);

    const user = createUserWithPassword(email, passwordHash, name) as any;

    const cookie = createAuthCookie(user);

    const response = NextResponse.json({ success: true, user });
    response.headers.set("Set-Cookie", cookie);

    return response;
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: error.message || "注册失败" }, { status: 500 });
  }
}
