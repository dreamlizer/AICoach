import { NextResponse } from "next/server";
import { verifyCode, getUserByEmail } from "@/lib/db";
import { checkLoginRateLimit, handleLoginSuccess, handleLoginFailure } from "@/lib/auth-helpers";
import { isAuthSecretMissingError } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and verification code are required" }, { status: 400 });
    }

    const rateLimitError = await checkLoginRateLimit(email);
    if (rateLimitError) return rateLimitError;

    const isValid = await verifyCode(email, code);
    if (!isValid) {
      return handleLoginFailure(email, "Email or verification code is incorrect");
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return handleLoginFailure(email, "Email or verification code is incorrect");
    }

    return handleLoginSuccess(user);
  } catch (error) {
    console.error("Login Error:", error);
    if (isAuthSecretMissingError(error)) {
      return NextResponse.json({ error: "Login service misconfigured: missing AUTH_JWT_SECRET" }, { status: 500 });
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
