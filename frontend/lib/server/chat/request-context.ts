import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { countUserMessages } from "@/lib/db";
import { getDailyMessageCount } from "@/lib/stats_db";
import { getCurrentUser } from "@/lib/session";

export async function resolveIdentityContext(conversationId: string) {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown_ip";
  const user = await getCurrentUser();
  const userId = user ? user.id : null;
  const statsIdentifier = userId ? `user:${userId}` : `ip:${ip}`;
  const statsType: "user" | "ip" = userId ? "user" : "ip";

  if (!userId) {
    const userMsgCount = await countUserMessages(conversationId);
    if (userMsgCount >= 2) {
      return {
        errorResponse: NextResponse.json({ error: "Anonymous limit reached", code: "LIMIT_REACHED" }, { status: 403 }),
      };
    }
  } else {
    let dailyCount = 0;
    try {
      dailyCount = getDailyMessageCount(statsIdentifier);
    } catch (error) {
      console.warn("Daily message count is unavailable, skipping daily limit check:", error);
    }
    if (dailyCount >= 100) {
      return {
        errorResponse: NextResponse.json(
          { error: "Daily limit reached (100 messages)", code: "DAILY_LIMIT_REACHED" },
          { status: 403 }
        ),
      };
    }
  }

  return { user, userId, statsIdentifier, statsType, errorResponse: null };
}

