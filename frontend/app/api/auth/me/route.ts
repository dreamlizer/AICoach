import { NextResponse } from "next/server";
import { getUserById } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { user: null, authenticated: false },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }

  try {
    const user = await getUserById(currentUser.id);

    if (!user) {
      return NextResponse.json(
        { user: null, authenticated: false },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
        },
        authenticated: true,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error) {
    console.error("Auth me route failed:", error);
    return NextResponse.json(
      { error: "AUTH_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}

