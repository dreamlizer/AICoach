import { execute, queryAll, queryOne } from "./core";

export const incrementUserTokens = async (
  userId: number,
  total: number,
  input: number,
  output: number,
  cacheHit = 0,
  cacheMiss = 0
) => {
  const now = new Date().toISOString();
  const exists = await queryOne<{ v: number }>("SELECT 1 as v FROM user_stats WHERE user_id = ?", [userId]);

  if (exists) {
    await execute(
      `
      UPDATE user_stats
      SET total_tokens = total_tokens + ?,
          input_tokens = input_tokens + ?,
          output_tokens = output_tokens + ?,
          cache_hit_tokens = cache_hit_tokens + ?,
          cache_miss_tokens = cache_miss_tokens + ?,
          last_updated = ?
      WHERE user_id = ?
    `,
      [total, input, output, cacheHit, cacheMiss, now, userId]
    );
    return;
  }

  await execute(
    `
    INSERT INTO user_stats (
      user_id,
      total_tokens,
      input_tokens,
      output_tokens,
      cache_hit_tokens,
      cache_miss_tokens,
      last_updated
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
    [userId, total, input, output, cacheHit, cacheMiss, now]
  );
};

export const incrementToolUsage = async (userId: number, toolId: string) => {
  if (!toolId) return;
  const now = new Date().toISOString();
  const exists = await queryOne<{ v: number }>("SELECT 1 as v FROM tool_usage WHERE user_id = ? AND tool_id = ?", [
    userId,
    toolId,
  ]);

  if (exists) {
    await execute("UPDATE tool_usage SET usage_count = usage_count + 1, last_used = ? WHERE user_id = ? AND tool_id = ?", [
      now,
      userId,
      toolId,
    ]);
    return;
  }

  await execute("INSERT INTO tool_usage (user_id, tool_id, usage_count, last_used) VALUES (?, ?, 1, ?)", [userId, toolId, now]);
};

export const getUserStats = async (userId: number) => {
  const stats = await queryOne<any>("SELECT * FROM user_stats WHERE user_id = ?", [userId]);
  const tools = await queryAll<any>("SELECT tool_id, usage_count FROM tool_usage WHERE user_id = ? ORDER BY usage_count DESC", [
    userId,
  ]);
  return {
    tokens: stats || { total_tokens: 0, input_tokens: 0, output_tokens: 0 },
    tool_usage: tools || [],
  };
};

export const trackEvent = async (
  userId: number | null,
  eventType: string,
  category = "general",
  data: Record<string, any> = {}
) => {
  try {
    await execute("INSERT INTO analytics_events (user_id, event_type, category, event_data, created_at) VALUES (?, ?, ?, ?, ?)", [
      userId,
      eventType,
      category,
      JSON.stringify(data),
      new Date().toISOString(),
    ]);
  } catch (error) {
    console.error("Failed to track event:", error);
  }
};

export const getAnalyticsEvents = async (limit = 50, userId: number | null = null) => {
  let sql = "SELECT * FROM analytics_events";
  const params: any[] = [];

  if (userId) {
    sql += " WHERE user_id = ?";
    params.push(userId);
  }

  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);
  return await queryAll(sql, params);
};
