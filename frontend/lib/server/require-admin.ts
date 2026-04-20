import { NextResponse } from "next/server";
import { getUserById } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function requireAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = await getUserById(currentUser.id);
  if (!user || user.role !== "admin") {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    user,
  };
}
