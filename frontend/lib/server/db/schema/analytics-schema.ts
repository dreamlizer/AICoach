import type { DatabaseInstance } from "../core";
import { hasColumn } from "./helpers";

export function initializeAnalyticsSchema(db: DatabaseInstance) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS usage_stats (
       identifier TEXT PRIMARY KEY,
       identifier_type TEXT NOT NULL,
       total_tokens INTEGER DEFAULT 0,
       input_tokens INTEGER DEFAULT 0,
       output_tokens INTEGER DEFAULT 0,
       cache_hit_tokens INTEGER DEFAULT 0,
       cache_miss_tokens INTEGER DEFAULT 0,
       last_updated TEXT
     )`
  );
  db.exec(
    `CREATE TABLE IF NOT EXISTS daily_usage_stats (
       identifier TEXT,
       date TEXT,
       total_tokens INTEGER DEFAULT 0,
       input_tokens INTEGER DEFAULT 0,
       output_tokens INTEGER DEFAULT 0,
       message_count INTEGER DEFAULT 0,
       word_count INTEGER DEFAULT 0,
       PRIMARY KEY (identifier, date)
    )`
  );
  db.exec(
    `CREATE TABLE IF NOT EXISTS daily_tool_usage (
       identifier TEXT,
       date TEXT,
       tool_id TEXT,
       usage_count INTEGER DEFAULT 0,
       PRIMARY KEY (identifier, date, tool_id)
    )`
  );

  db.exec(
    `CREATE TABLE IF NOT EXISTS user_stats (
       user_id INTEGER PRIMARY KEY,
       total_tokens INTEGER DEFAULT 0,
       input_tokens INTEGER DEFAULT 0,
       output_tokens INTEGER DEFAULT 0,
       last_updated TEXT
     )`
  );
  db.exec(
    `CREATE TABLE IF NOT EXISTS tool_usage (
       user_id INTEGER,
       tool_id TEXT,
       usage_count INTEGER DEFAULT 0,
       last_used TEXT,
       PRIMARY KEY (user_id, tool_id)
     )`
  );
  db.exec(
    `CREATE TABLE IF NOT EXISTS analytics_events (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id INTEGER,
       event_type TEXT NOT NULL,
       category TEXT,
       event_data TEXT,
       created_at TEXT NOT NULL
     )`
  );

  try {
    if (!hasColumn(db, "user_stats", "cache_hit_tokens")) {
      db.exec("ALTER TABLE user_stats ADD COLUMN cache_hit_tokens INTEGER DEFAULT 0");
    }
    if (!hasColumn(db, "user_stats", "cache_miss_tokens")) {
      db.exec("ALTER TABLE user_stats ADD COLUMN cache_miss_tokens INTEGER DEFAULT 0");
    }
  } catch (error) {
    console.error("Schema migration error (user_stats cache):", error);
  }

  db.exec("CREATE INDEX IF NOT EXISTS idx_usage_type ON usage_stats(identifier_type)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_usage_stats(date)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_daily_usage_date_identifier ON daily_usage_stats(date, identifier)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_daily_tool_usage_date_usage ON daily_tool_usage(date, usage_count DESC)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id)");
}
