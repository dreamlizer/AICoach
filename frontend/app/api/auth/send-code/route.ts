import { NextResponse } from "next/server";
import { saveVerificationCode, getUserByEmail, User } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email, type } = await request.json();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }

    // Check user existence based on flow type
    // Explicitly cast or type the user to avoid 'type {}' inference issues in some environments
    const user: User | undefined = getUserByEmail(email);

    if (type === "register" && user) {
      return NextResponse.json({ error: "该邮箱已注册，请直接登录" }, { status: 400 });
    }

    if (type === "login" && !user) {
       return NextResponse.json({ error: "该账号不存在，请先注册" }, { status: 400 });
    }

    if (type === "reset" && !user) {
       return NextResponse.json({ error: "该账号不存在，无法找回密码" }, { status: 400 });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to DB
    saveVerificationCode(email, code);

    // Send Email
    await sendVerificationEmail(email, code);

    // Check if user exists (to determine if we need to ask for name) - Legacy check, mostly for Login flow now
    // Since we handle registration explicitly, this might be less relevant for 'register' flow but good for 'login' flow
    // logic if we wanted to support auto-registration on login (which we don't anymore)
    const needsName = user ? (!user.name || !user.name.trim()) : true;
    const isNewUser = !user;

    return NextResponse.json({ success: true, message: "验证码已发送", isNewUser, needsName });
  } catch (error: any) {
    console.error("Send Code Error:", error);
    // Return specific error message for debugging
    return NextResponse.json({ error: error.message || "发送验证码失败，请稍后重试" }, { status: 500 });
  }
}
