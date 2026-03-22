import { getDb } from "./db";

// Export getStatsDb as an alias to getDb to maintain compatibility
export const getStatsDb = getDb;

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
  
  const transaction = db.transaction(() => {
    // 1. Update Global Stats
    const exists = db.prepare("SELECT 1 FROM usage_stats WHERE identifier = ?").get(identifier);
    
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
      `).run(total, input, output, cacheHit, cacheMiss, nowIso, identifier);
    } else {
      db.prepare(`
        INSERT INTO usage_stats (
          identifier, identifier_type, total_tokens, input_tokens, output_tokens, 
          cache_hit_tokens, cache_miss_tokens, last_updated
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(identifier, type, total, input, output, cacheHit, cacheMiss, nowIso);
    }

    // 2. Update Daily Usage Stats
    const dailyExists = db.prepare("SELECT 1 FROM daily_usage_stats WHERE identifier = ? AND date = ?").get(identifier, dateStr);
    
    if (dailyExists) {
      db.prepare(`
        UPDATE daily_usage_stats 
        SET total_tokens = total_tokens + ?, 
            input_tokens = input_tokens + ?, 
            output_tokens = output_tokens + ?, 
            message_count = message_count + 1,
            word_count = word_count + ?
        WHERE identifier = ? AND date = ?
      `).run(total, input, output, messageWordCount, identifier, dateStr);
    } else {
      db.prepare(`
        INSERT INTO daily_usage_stats (
          identifier, date, total_tokens, input_tokens, output_tokens, message_count, word_count
        ) VALUES (?, ?, ?, ?, ?, 1, ?)
      `).run(identifier, dateStr, total, input, output, messageWordCount);
    }

    // 3. Update Daily Tool Usage (if toolId provided)
    if (toolId) {
      const toolExists = db.prepare("SELECT 1 FROM daily_tool_usage WHERE identifier = ? AND date = ? AND tool_id = ?").get(identifier, dateStr, toolId);
      
      if (toolExists) {
        db.prepare(`
          UPDATE daily_tool_usage 
          SET usage_count = usage_count + 1
          WHERE identifier = ? AND date = ? AND tool_id = ?
        `).run(identifier, dateStr, toolId);
      } else {
        db.prepare(`
          INSERT INTO daily_tool_usage (identifier, date, tool_id, usage_count)
          VALUES (?, ?, ?, 1)
        `).run(identifier, dateStr, toolId);
      }
    }
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

  // User Info Map
  const users = db.prepare("SELECT id, name, email, created_at FROM users").all() as any[];
  const userInfo: Record<string, any> = {};
  users.forEach(u => {
    userInfo[`user:${u.id}`] = {
      name: u.name,
      email: u.email,
      created_at: u.created_at
    };
  });

  // Detailed Lists
  const dailyStats = db.prepare("SELECT * FROM daily_usage_stats ORDER BY date DESC LIMIT 100").all();
  const toolStats = db.prepare("SELECT * FROM daily_tool_usage ORDER BY date DESC, usage_count DESC LIMIT 100").all();

  return {
    summary,
    userInfo,
    dailyStats,
    toolStats
  };
};
