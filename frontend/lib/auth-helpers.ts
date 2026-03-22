import { NextResponse } from "next/server";
import { getRecentLoginFailureCount, recordLoginAttempt, clearLoginAttempts } from "@/lib/db";
import { createAuthCookie } from "@/lib/session";

/**
 * Checks if the user has exceeded the login failure limit.
 * @param email User email
 * @returns NextResponse if rate limit exceeded, otherwise null
 */
export function checkLoginRateLimit(email: string): NextResponse | null {
  const failureCount = getRecentLoginFailureCount(email, 15 * 60 * 1000);
  if (failureCount >= 5) {
    return NextResponse.json({ error: "登录失败次数过多，请稍后再试" }, { status: 429 });
  }
  return null;
}

/**
 * Handles successful login: clears attempts, generates token, sets cookie.
 * @param user User object (must have id and email)
 * @returns NextResponse with success status and cookie
 */
export function handleLoginSuccess(user: any) {
  clearLoginAttempts(user.email);
  const cookie = createAuthCookie(user);

  const response = NextResponse.json({ success: true, user });
  response.headers.set("Set-Cookie", cookie);
  return response;
}

/**
 * Handles login failure: records attempt and returns error response.
 * @param email User email
 * @param reason Error message
 * @returns NextResponse with error status
 */
export function handleLoginFailure(email: string, reason: string = "邮箱或密码错误") {
  recordLoginAttempt(email, false);
  return NextResponse.json({ error: reason }, { status: 401 });
}
