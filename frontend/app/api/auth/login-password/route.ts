import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db";
import bcrypt from "bcryptjs";
import { checkLoginRateLimit, handleLoginSuccess, handleLoginFailure } from "@/lib/auth-helpers";
import { isAuthSecretMissingError } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const rateLimitError = await checkLoginRateLimit(email);
    if (rateLimitError) return rateLimitError;

    const user = await getUserByEmail(email);
    if (!user) {
      return handleLoginFailure(email, "Email or password is incorrect");
    }

    if (!user.password_hash) {
      return handleLoginFailure(email, "This account does not have a password yet. Please log in with verification code first.");
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return handleLoginFailure(email, "Email or password is incorrect");
    }

    return handleLoginSuccess(user);
  } catch (error) {
    console.error("Login Password Error:", error);
    if (isAuthSecretMissingError(error)) {
      return NextResponse.json({ error: "Login service misconfigured: missing AUTH_JWT_SECRET" }, { status: 500 });
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
