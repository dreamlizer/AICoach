import { NextResponse } from "next/server";
import { serialize } from "cookie";

export async function POST() {
  // Clear the cookie by setting it to expire immediately
  const cookie = serialize("auth_token", "", {
    httpOnly: true,
    secure: false, // Match the login setting (false for compatibility)
    expires: new Date(0), // Expire immediately
    path: "/",
    sameSite: "lax", // Match the login setting
  });

  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", cookie);

  return response;
}
