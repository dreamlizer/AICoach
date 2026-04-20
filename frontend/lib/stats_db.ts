import { getDb } from "./db";

// Export getStatsDb as an alias to getDb to maintain compatibility
export const getStatsDb = getDb;

type StatsWriteInput = {
  identifier: string;
  type: "user" | "ip";
  total: number;
  input: number;
  output: number;
  cacheHit: number;
  cacheMiss: number;
  messageWordCount: number;
  toolId: string | null;
  nowIso: string;
  dateStr: string;
};

const writeUsageStats = (db: ReturnType<typeof getDb>, payload: StatsWriteInput) => {
  const exists = db.prepare("SELECT 1 FROM usage_stats WHERE identifier = ?").get(payload.identifier);
  if (exists) {
    db.prepare(`
      UPDATE usage_stats 
      SET total_tokens = total_tokens + ?, 
          input_tokens = input_tokens + ?, 
          output_tokens = output_tokens + ?, 
          cache_hit_tokens = cache_hit_tokens + ?,
          cache_miss_tokens = cache_miss_tokens + ?,
          last_updated = ? 
      WHERE identifier = ?
    `).run(
      payload.total,
      payload.input,
      payload.output,
      payload.cacheHit,
      payload.cacheMiss,
      payload.nowIso,
      payload.identifier
    );
    return;
  }
  db.prepare(`
    INSERT INTO usage_stats (
      identifier, identifier_type, total_tokens, input_tokens, output_tokens, 
      cache_hit_tokens, cache_miss_tokens, last_updated
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    payload.identifier,
    payload.type,
    payload.total,
    payload.input,
    payload.output,
    payload.cacheHit,
    payload.cacheMiss,
    payload.nowIso
  );
};

const writeDailyUsageStats = (db: ReturnType<typeof getDb>, payload: StatsWriteInput) => {
  const dailyExists = db.prepare("SELECT 1 FROM daily_usage_stats WHERE identifier = ? AND date = ?").get(payload.identifier, payload.dateStr);
  if (dailyExists) {
    db.prepare(`
      UPDATE daily_usage_stats 
      SET total_tokens = total_tokens + ?, 
          input_tokens = input_tokens + ?, 
          output_tokens = output_tokens + ?, 
          message_count = message_count + 1,
          word_count = word_count + ?
      WHERE identifier = ? AND date = ?
    `).run(
      payload.total,
      payload.input,
      payload.output,
      payload.messageWordCount,
      payload.identifier,
      payload.dateStr
    );
    return;
  }
  db.prepare(`
    INSERT INTO daily_usage_stats (
      identifier, date, total_tokens, input_tokens, output_tokens, message_count, word_count
    ) VALUES (?, ?, ?, ?, ?, 1, ?)
  `).run(
    payload.identifier,
    payload.dateStr,
    payload.total,
    payload.input,
    payload.output,
    payload.messageWordCount
  );
};

const writeDailyToolUsage = (db: ReturnType<typeof getDb>, payload: StatsWriteInput) => {
  if (!payload.toolId) return;
  const toolExists = db.prepare("SELECT 1 FROM daily_tool_usage WHERE identifier = ? AND date = ? AND tool_id = ?").get(payload.identifier, payload.dateStr, payload.toolId);
  if (toolExists) {
    db.prepare(`
      UPDATE daily_tool_usage 
      SET usage_count = usage_count + 1
      WHERE identifier = ? AND date = ? AND tool_id = ?
    `).run(payload.identifier, payload.dateStr, payload.toolId);
    return;
  }
  db.prepare(`
    INSERT INTO daily_tool_usage (identifier, date, tool_id, usage_count)
    VALUES (?, ?, ?, 1)
  `).run(payload.identifier, payload.dateStr, payload.toolId);
};

// Helper to increment token usage & daily stats
export const incrementTokenStats = (
  identifier: string,
  type: 'user' | 'ip',
  total: number, 
  input: number, 
  output: number,
  cacheHit: number = 0,
  cacheMiss: number = 0,
  messageWordCount: number = 0,
  toolId: string | null = null
) => {
  const db = getDb();
  const now = new Date();
  const nowIso = now.toISOString();
  const dateStr = nowIso.split('T')[0]; // YYYY-MM-DD
  const payload: StatsWriteInput = {
    identifier,
    type,
    total,
    input,
    output,
    cacheHit,
    cacheMiss,
    messageWordCount,
    toolId,
    nowIso,
    dateStr
  };
  
  const transaction = db.transaction(() => {
    writeUsageStats(db, payload);
    writeDailyUsageStats(db, payload);
    writeDailyToolUsage(db, payload);
  });

  transaction();
};

export const getUsageStats = (identifier: string) => {
  const db = getDb();
  return db.prepare("SELECT * FROM usage_stats WHERE identifier = ?").get(identifier);
};

export const getDailyMessageCount = (identifier: string) => {
  const db = getDb();
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const result = db.prepare("SELECT message_count FROM daily_usage_stats WHERE identifier = ? AND date = ?").get(identifier, dateStr) as { message_count: number } | undefined;
  return result ? result.message_count : 0;
};

export const getDashboardStats = () => {
  const db = getDb();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // A. Registered Users (Main DB)
  const totalUsers = (db.prepare("SELECT COUNT(*) as count FROM users").get() as any).count;
  const newUsersToday = (db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at LIKE ?").get(`${today}%`) as any).count;

  // B. Active Users (Stats DB)
  const activeToday = (db.prepare("SELECT COUNT(DISTINCT identifier) as count FROM daily_usage_stats WHERE date = ?").get(today) as any).count;
  const activeWeek = (db.prepare("SELECT COUNT(DISTINCT identifier) as count FROM daily_usage_stats WHERE date >= ?").get(oneWeekAgo) as any).count;
  const activeMonth = (db.prepare("SELECT COUNT(DISTINCT identifier) as count FROM daily_usage_stats WHERE date >= ?").get(oneMonthAgo) as any).count;

  const summary = {
    totalUsers,
    newUsersToday,
    activeToday,
    activeWeek,
    activeMonth
  };

  // Detailed Lists
  const dailyStats = db.prepare("SELECT * FROM daily_usage_stats ORDER BY date DESC LIMIT 100").all();
  const toolStats = db.prepare("SELECT * FROM daily_tool_usage ORDER BY date DESC, usage_count DESC LIMIT 100").all();
  const identifiers = new Set<string>();
  (dailyStats as any[]).forEach((row) => {
    if (typeof row.identifier === "string" && row.identifier.startsWith("user:")) identifiers.add(row.identifier);
  });
  (toolStats as any[]).forEach((row) => {
    if (typeof row.identifier === "string" && row.identifier.startsWith("user:")) identifiers.add(row.identifier);
  });

  const userInfo: Record<string, any> = {};
  const userIds = Array.from(identifiers)
    .map((identifier) => Number(identifier.slice("user:".length)))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (userIds.length > 0) {
    const placeholders = userIds.map(() => "?").join(",");
    const users = db
      .prepare(`SELECT id, name, email, created_at FROM users WHERE id IN (${placeholders})`)
      .all(...userIds) as any[];
    users.forEach((u) => {
      userInfo[`user:${u.id}`] = {
        name: u.name,
        email: u.email,
        created_at: u.created_at,
      };
    });
  }

  return {
    summary,
    userInfo,
    dailyStats,
    toolStats
  };
};

export const getDailyUsageStatsRows = () => {
  const db = getDb();
  return db.prepare("SELECT * FROM daily_usage_stats ORDER BY date DESC").all();
};

export const getDailyToolUsageRows = () => {
  const db = getDb();
  return db.prepare("SELECT * FROM daily_tool_usage ORDER BY date DESC, usage_count DESC").all();
};
