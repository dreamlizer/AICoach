import { NextResponse } from "next/server";
import { verifyCode, createUserWithPassword, getUserByEmail } from "@/lib/db";
import { createAuthCookie, validatePassword, isAuthSecretMissingError } from "@/lib/session";
import { sanitizeUser } from "@/lib/auth-helpers";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, code, password, name } = await request.json();

    if (!email || !code || !password || !name) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const isValid = await verifyCode(email, code);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: "This email is already registered" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUserWithPassword(email, passwordHash, name);
    if (!user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    const safeUser = sanitizeUser(user);
    const cookie = createAuthCookie(safeUser);

    const response = NextResponse.json({ success: true, user: safeUser });
    response.headers.set("Set-Cookie", cookie);
    return response;
  } catch (error: any) {
    console.error("Register Error:", error);
    if (isAuthSecretMissingError(error)) {
      return NextResponse.json({ error: "Login service misconfigured: missing AUTH_JWT_SECRET" }, { status: 500 });
    }
    return NextResponse.json({ error: error?.message || "Registration failed" }, { status: 500 });
  }
}
