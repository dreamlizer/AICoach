import { NextResponse } from "next/server";
import { getRecentLoginFailureCount, recordLoginAttempt, clearLoginAttempts } from "@/lib/db";
import { createAuthCookie } from "@/lib/session";

type AuthUser = {
  id: number;
  email: string;
  name?: string | null;
  avatar?: string | null;
  role?: string | null;
};

export function sanitizeUser(user: any): AuthUser {
  return {
    id: Number(user.id),
    email: user.email,
    name: user.name ?? null,
    avatar: user.avatar ?? null,
    role: user.role ?? null,
  };
}

export async function checkLoginRateLimit(email: string): Promise<NextResponse | null> {
  const failureCount = await getRecentLoginFailureCount(email, 15 * 60 * 1000);
  if (failureCount >= 5) {
    return NextResponse.json({ error: "登录失败次数过多，请稍后再试" }, { status: 429 });
  }
  return null;
}

export async function handleLoginSuccess(user: any) {
  await clearLoginAttempts(user.email);
  const safeUser = sanitizeUser(user);
  const cookie = createAuthCookie(safeUser);

  const response = NextResponse.json({ success: true, user: safeUser });
  response.headers.set("Set-Cookie", cookie);
  return response;
}

export async function handleLoginFailure(email: string, reason: string = "邮箱或密码错误") {
  await recordLoginAttempt(email, false);
  return NextResponse.json({ error: reason }, { status: 401 });
}
