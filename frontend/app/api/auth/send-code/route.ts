import { NextResponse } from "next/server";
import { saveVerificationCode, getRecentVerificationCodeCount, getUserByEmail, User } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email, type } = await request.json();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    const user: User | undefined = await getUserByEmail(email);

    if (type === "register" && user) {
      return NextResponse.json({ error: "This email is already registered" }, { status: 400 });
    }

    if (type === "login" && !user) {
      return NextResponse.json({ error: "Account does not exist, please register first" }, { status: 400 });
    }

    if (type === "reset" && !user) {
      return NextResponse.json({ error: "Account does not exist" }, { status: 400 });
    }

    const recentCount = await getRecentVerificationCodeCount(email, 60 * 1000);
    if (recentCount > 0) {
      return NextResponse.json({ error: "Verification code requested too frequently" }, { status: 429 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await saveVerificationCode(email, code);
    await sendVerificationEmail(email, code);

    const needsName = user ? (!user.name || !user.name.trim()) : true;
    const isNewUser = !user;

    return NextResponse.json({ success: true, message: "Verification code sent", isNewUser, needsName });
  } catch (error: any) {
    console.error("Send Code Error:", error);
    return NextResponse.json({ error: error.message || "Failed to send verification code" }, { status: 500 });
  }
}
