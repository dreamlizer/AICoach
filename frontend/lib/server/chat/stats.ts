import { incrementTokenStats } from "@/lib/stats_db";
import { TokenStats } from "./types";

export function writeStatsSafely(params: {
  requestId: string;
  statsIdentifier: string;
  statsType: "user" | "ip";
  message: string;
  toolId?: string | null;
  tokenStats: TokenStats;
}) {
  const { requestId, statsIdentifier, statsType, message, toolId, tokenStats } = params;
  const statsWriteStart = Date.now();
  try {
    incrementTokenStats(
      statsIdentifier,
      statsType,
      tokenStats.totalTokens,
      tokenStats.inputTokens,
      tokenStats.outputTokens,
      tokenStats.cacheHitTokens,
      tokenStats.cacheMissTokens,
      message ? message.length : 0,
      toolId || null
    );
    const statsWriteMs = Date.now() - statsWriteStart;
    console.log(`[${requestId}] Stats write took ${statsWriteMs}ms`);
    if (statsWriteMs > 200) {
      console.warn(`[${requestId}] 鈿狅笍 Slow stats write: ${statsWriteMs}ms`);
    }
  } catch (statsWriteError) {
    const statsWriteMs = Date.now() - statsWriteStart;
    console.error(`[${requestId}] 鈿狅笍 Stats write failed after ${statsWriteMs}ms:`, statsWriteError);
    console.warn(`[${requestId}] 鉁?Main chat flow will continue without blocking response.`);
  }
}
