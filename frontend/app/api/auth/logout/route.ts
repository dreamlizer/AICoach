import { NextResponse } from "next/server";
import { createLogoutCookie } from "@/lib/session";

export async function POST() {
  // Clear the cookie by setting it to expire immediately
  const cookie = createLogoutCookie();

  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", cookie);

  return response;
}
