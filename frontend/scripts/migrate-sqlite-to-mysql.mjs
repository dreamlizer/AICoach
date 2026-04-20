import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import mysql from "mysql2/promise";

const args = process.argv.slice(2);

const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return "";
  return String(args[index + 1] || "").trim();
};

const hasFlag = (flag) => args.includes(flag);

const sqliteArg = getArgValue("--sqlite");
const mysqlUrlArg = getArgValue("--mysql-url") || process.env.MYSQL_URL || "";
const hostArg = getArgValue("--host") || process.env.MYSQL_HOST || "127.0.0.1";
const portArg = Number(getArgValue("--port") || process.env.MYSQL_PORT || 3306);
const userArg = getArgValue("--user") || process.env.MYSQL_USER || "root";
const passwordArg = getArgValue("--password") || process.env.MYSQL_PASSWORD || "";
const databaseArg = getArgValue("--database") || process.env.MYSQL_DATABASE || "";
const batchSizeArg = Number(getArgValue("--batch-size") || 500);
const tablesArg = getArgValue("--tables");
const truncateBeforeImport = hasFlag("--truncate");

const deriveDatabaseFromUrl = (url) => {
  try {
    const parsed = new URL(url);
    const db = parsed.pathname.replace(/^\//, "").trim();
    return db || "";
  } catch {
    return "";
  }
};

const finalDatabase = databaseArg || deriveDatabaseFromUrl(mysqlUrlArg) || "ai_coach";

if (!sqliteArg) {
  console.error("Usage: node scripts/migrate-sqlite-to-mysql.mjs --sqlite <path> [--mysql-url <url> | --host ... --database ...] [--truncate] [--batch-size 500]");
  process.exit(1);
}

if (!Number.isFinite(batchSizeArg) || batchSizeArg <= 0) {
  console.error("Error: --batch-size must be a positive number.");
  process.exit(1);
}

const sqlitePath = path.resolve(sqliteArg);
if (!fs.existsSync(sqlitePath)) {
  console.error(`Error: sqlite file does not exist: ${sqlitePath}`);
  process.exit(1);
}

const TABLE_SCHEMAS = {
  conversations: `
    CREATE TABLE IF NOT EXISTS conversations (
      id VARCHAR(255) PRIMARY KEY,
      title TEXT NOT NULL,
      created_at VARCHAR(64) NOT NULL,
      updated_at VARCHAR(64) NOT NULL,
      tool_id VARCHAR(255) NULL,
      user_id BIGINT NULL,
      short_code VARCHAR(64) NULL,
      UNIQUE KEY idx_conversations_short_code (short_code),
      KEY idx_conversations_updated_at (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  messages: `
    CREATE TABLE IF NOT EXISTS messages (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      conversation_id VARCHAR(255) NOT NULL,
      role VARCHAR(64) NOT NULL,
      content LONGTEXT NOT NULL,
      created_at VARCHAR(64) NOT NULL,
      kind VARCHAR(64) DEFAULT 'text',
      metadata LONGTEXT NULL,
      KEY idx_messages_conversation_id (conversation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  user_profiles: `
    CREATE TABLE IF NOT EXISTS user_profiles (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      tags LONGTEXT NOT NULL,
      personality LONGTEXT NOT NULL,
      leadership_level VARCHAR(255) NOT NULL,
      last_updated VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255) NULL,
      avatar TEXT NULL,
      feature_order_json LONGTEXT NULL,
      created_at VARCHAR(64) NOT NULL,
      password_hash VARCHAR(255) NULL,
      role VARCHAR(64) DEFAULT 'user',
      UNIQUE KEY idx_users_email_unique (email),
      KEY idx_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  usage_stats: `
    CREATE TABLE IF NOT EXISTS usage_stats (
      identifier VARCHAR(255) PRIMARY KEY,
      identifier_type VARCHAR(64) NOT NULL,
      total_tokens BIGINT DEFAULT 0,
      input_tokens BIGINT DEFAULT 0,
      output_tokens BIGINT DEFAULT 0,
      cache_hit_tokens BIGINT DEFAULT 0,
      cache_miss_tokens BIGINT DEFAULT 0,
      last_updated VARCHAR(64) NULL,
      KEY idx_usage_type (identifier_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  daily_usage_stats: `
    CREATE TABLE IF NOT EXISTS daily_usage_stats (
      identifier VARCHAR(255) NOT NULL,
      date VARCHAR(32) NOT NULL,
      total_tokens BIGINT DEFAULT 0,
      input_tokens BIGINT DEFAULT 0,
      output_tokens BIGINT DEFAULT 0,
      message_count BIGINT DEFAULT 0,
      word_count BIGINT DEFAULT 0,
      PRIMARY KEY (identifier, date),
      KEY idx_daily_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  daily_tool_usage: `
    CREATE TABLE IF NOT EXISTS daily_tool_usage (
      identifier VARCHAR(255) NOT NULL,
      date VARCHAR(32) NOT NULL,
      tool_id VARCHAR(255) NOT NULL,
      usage_count BIGINT DEFAULT 0,
      PRIMARY KEY (identifier, date, tool_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  verification_codes: `
    CREATE TABLE IF NOT EXISTS verification_codes (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      code VARCHAR(64) NOT NULL,
      expires_at VARCHAR(64) NOT NULL,
      created_at VARCHAR(64) NOT NULL,
      KEY idx_verification_codes_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  login_attempts: `
    CREATE TABLE IF NOT EXISTS login_attempts (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      success TINYINT NOT NULL,
      created_at VARCHAR(64) NOT NULL,
      KEY idx_login_attempts_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  user_stats: `
    CREATE TABLE IF NOT EXISTS user_stats (
      user_id BIGINT PRIMARY KEY,
      total_tokens BIGINT DEFAULT 0,
      input_tokens BIGINT DEFAULT 0,
      output_tokens BIGINT DEFAULT 0,
      cache_hit_tokens BIGINT DEFAULT 0,
      cache_miss_tokens BIGINT DEFAULT 0,
      last_updated VARCHAR(64) NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  tool_usage: `
    CREATE TABLE IF NOT EXISTS tool_usage (
      user_id BIGINT NOT NULL,
      tool_id VARCHAR(255) NOT NULL,
      usage_count BIGINT DEFAULT 0,
      last_used VARCHAR(64) NULL,
      PRIMARY KEY (user_id, tool_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  analytics_events: `
    CREATE TABLE IF NOT EXISTS analytics_events (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NULL,
      event_type VARCHAR(255) NOT NULL,
      category VARCHAR(255) NULL,
      event_data LONGTEXT NULL,
      created_at VARCHAR(64) NOT NULL,
      KEY idx_analytics_events_type (event_type),
      KEY idx_analytics_events_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  assessments: `
    CREATE TABLE IF NOT EXISTS assessments (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      type VARCHAR(64) NOT NULL,
      title VARCHAR(255) NULL,
      result LONGTEXT NOT NULL,
      metadata LONGTEXT NULL,
      created_at VARCHAR(64) NOT NULL,
      KEY idx_assessments_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  winlinez_scores: `
    CREATE TABLE IF NOT EXISTS winlinez_scores (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      score INT NOT NULL,
      lines_cleared INT DEFAULT 0,
      balls_cleared INT DEFAULT 0,
      moves_played INT DEFAULT 0,
      piece_style VARCHAR(64) DEFAULT 'orb',
      metadata LONGTEXT NULL,
      created_at VARCHAR(64) NOT NULL,
      KEY idx_winlinez_scores_user (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  pikachu_volleyball_scores: `
    CREATE TABLE IF NOT EXISTS pikachu_volleyball_scores (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      p1_score INT NOT NULL,
      p2_score INT NOT NULL,
      winning_score INT NOT NULL,
      difficulty VARCHAR(64) NOT NULL,
      theme_id VARCHAR(255) NOT NULL,
      theme_preview_src TEXT NOT NULL,
      metadata LONGTEXT NULL,
      created_at VARCHAR(64) NOT NULL,
      KEY idx_pv_scores_user (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  dictionary_entries: `
    CREATE TABLE IF NOT EXISTS dictionary_entries (
      word VARCHAR(255) PRIMARY KEY,
      phonetic TEXT NULL,
      definition LONGTEXT NULL,
      translation LONGTEXT NULL,
      pos VARCHAR(255) NULL,
      collins INT DEFAULT 0,
      oxford INT DEFAULT 0,
      tag VARCHAR(255) NULL,
      bnc INT DEFAULT 0,
      frq INT DEFAULT 0,
      exchange LONGTEXT NULL,
      detail LONGTEXT NULL,
      audio TEXT NULL,
      source VARCHAR(64) DEFAULT 'ecdict',
      updated_at VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  dictionary_examples: `
    CREATE TABLE IF NOT EXISTS dictionary_examples (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      word VARCHAR(255) NOT NULL,
      english LONGTEXT NOT NULL,
      chinese LONGTEXT NULL,
      source VARCHAR(64) DEFAULT 'manual',
      created_at VARCHAR(64) NOT NULL,
      KEY idx_dictionary_examples_word (word),
      UNIQUE KEY idx_dictionary_examples_unique (word, english(255), source)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  dictionary_zh_entries: `
    CREATE TABLE IF NOT EXISTS dictionary_zh_entries (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      traditional VARCHAR(255) NOT NULL,
      simplified VARCHAR(255) NOT NULL,
      pinyin TEXT NULL,
      english LONGTEXT NOT NULL,
      source VARCHAR(64) DEFAULT 'cc-cedict',
      updated_at VARCHAR(64) NOT NULL,
      KEY idx_dictionary_zh_simplified (simplified),
      KEY idx_dictionary_zh_traditional (traditional)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
};

const defaultTables = Object.keys(TABLE_SCHEMAS);
const requestedTables = tablesArg
  ? tablesArg
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  : defaultTables;

const migrationTables = requestedTables.filter((name) => {
  if (TABLE_SCHEMAS[name]) return true;
  console.warn(`[skip] table not in migration list: ${name}`);
  return false;
});

if (migrationTables.length === 0) {
  console.error("Error: no valid tables to migrate.");
  process.exit(1);
}

const sqlite = new Database(sqlitePath, { readonly: true });

const getMysqlOptions = () => ({
  host: hostArg,
  port: portArg,
  user: userArg,
  password: passwordArg,
  multipleStatements: true,
  charset: "utf8mb4",
});

const insertRowsInBatches = async (conn, tableName, columns, rows, batchSize) => {
  if (rows.length === 0) return;

  const escapedColumns = columns.map((name) => `\`${name}\``).join(", ");

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const placeholders = batch.map(() => `(${columns.map(() => "?").join(",")})`).join(",");
    const sql = `INSERT INTO \`${tableName}\` (${escapedColumns}) VALUES ${placeholders}`;
    const values = [];

    for (const row of batch) {
      for (const col of columns) {
        values.push(row[col]);
      }
    }

    await conn.query(sql, values);
    console.info(`[insert] ${tableName}: ${Math.min(i + batch.length, rows.length)}/${rows.length}`);
  }
};

const run = async () => {
  let adminConn;
  let conn;

  try {
    const mysqlOptions = getMysqlOptions();

    if (mysqlUrlArg) {
      conn = await mysql.createConnection(mysqlUrlArg);
      await conn.query("SET NAMES utf8mb4");
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${finalDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await conn.query(`USE \`${finalDatabase}\``);
    } else {
      adminConn = await mysql.createConnection(mysqlOptions);
      await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${finalDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await adminConn.end();

      conn = await mysql.createConnection({
        ...mysqlOptions,
        database: finalDatabase,
      });
    }

    await conn.query("SET NAMES utf8mb4");
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");

    for (const tableName of migrationTables) {
      const tableExists = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
        .get(tableName);

      if (!tableExists) {
        console.warn(`[skip] sqlite table not found: ${tableName}`);
        continue;
      }

      console.info(`[table] ${tableName}`);
      await conn.query(TABLE_SCHEMAS[tableName]);

      if (truncateBeforeImport) {
        await conn.query(`TRUNCATE TABLE \`${tableName}\``);
      }

      const columnRows = sqlite.prepare(`PRAGMA table_info(${tableName})`).all();
      const columns = columnRows.map((col) => col.name);

      if (columns.length === 0) {
        console.warn(`[skip] no columns in sqlite table: ${tableName}`);
        continue;
      }

      const selectSql = `SELECT ${columns.map((col) => `"${col}"`).join(", ")} FROM ${tableName}`;
      const rows = sqlite.prepare(selectSql).all();
      console.info(`[read] ${tableName}: ${rows.length}`);

      await insertRowsInBatches(conn, tableName, columns, rows, batchSizeArg);

      const [[{ count }]] = await conn.query(`SELECT COUNT(1) AS count FROM \`${tableName}\``);
      console.info(`[done] ${tableName}: mysql rows=${count}`);
    }

    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    console.info("[success] sqlite -> mysql migration completed.");
  } catch (error) {
    console.error("[error] migration failed:", error);
    process.exitCode = 1;
  } finally {
    try {
      sqlite.close();
    } catch {}
    try {
      if (conn) await conn.end();
    } catch {}
    try {
      if (adminConn) await adminConn.end();
    } catch {}
  }
};

run();
