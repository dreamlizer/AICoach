import fs from "fs";
import path from "path";
import type { DatabaseInstance } from "../core";

export function migrateLegacyStatsDb(db: DatabaseInstance) {
  try {
    const oldStatsPath = path.join(process.cwd(), "token_stats.db");
    if (!fs.existsSync(oldStatsPath)) return;

    console.log("Found legacy token_stats.db, attempting migration...");
    db.exec(`ATTACH DATABASE '${oldStatsPath.replace(/'/g, "''")}' AS old_stats`);
    try {
      db.exec(`
        INSERT OR IGNORE INTO main.usage_stats
        (identifier, identifier_type, total_tokens, input_tokens, output_tokens, cache_hit_tokens, cache_miss_tokens, last_updated)
        SELECT identifier, identifier_type, total_tokens, input_tokens, output_tokens, cache_hit_tokens, cache_miss_tokens, last_updated
        FROM old_stats.usage_stats
      `);
      db.exec(`
        INSERT OR IGNORE INTO main.daily_usage_stats
        (identifier, date, total_tokens, input_tokens, output_tokens, message_count, word_count)
        SELECT identifier, date, total_tokens, input_tokens, output_tokens, message_count, word_count
        FROM old_stats.daily_usage_stats
      `);
      db.exec(`
        INSERT OR IGNORE INTO main.daily_tool_usage
        (identifier, date, tool_id, usage_count)
        SELECT identifier, date, tool_id, usage_count
        FROM old_stats.daily_tool_usage
      `);
      console.log("Migration from token_stats.db completed successfully.");
      db.exec("DETACH DATABASE old_stats");
      const migratedPath = oldStatsPath + ".migrated";
      fs.renameSync(oldStatsPath, migratedPath);
      console.log(`Renamed token_stats.db to ${path.basename(migratedPath)}`);
    } catch (error) {
      console.error("Error during data copy from token_stats.db:", error);
      try {
        db.exec("DETACH DATABASE old_stats");
      } catch {}
    }
  } catch (error) {
    console.error("Migration check failed:", error);
  }
}
