import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import { AsyncLocalStorage } from "async_hooks";
import mysql, { Pool, PoolConnection } from "mysql2/promise";
import { loadServerEnvValue } from "@/lib/server/chat/env";
import { initializeAnalyticsSchema } from "./schema/analytics-schema";
import { initializeAuthSchema } from "./schema/auth-schema";
import { initializeConversationSchema } from "./schema/conversation-schema";
import { initializeFeatureSchema } from "./schema/feature-schema";
import { migrateLegacyStatsDb } from "./schema/legacy-schema";

export interface User {
  id: number;
  email: string;
  name?: string;
  avatar?: string;
  feature_order_json?: string | null;
  created_at: string;
  password_hash?: string;
  role?: string;
}

export type DatabaseInstance = import("better-sqlite3").Database;
export type DbDriver = "sqlite" | "mysql";
export type SqlParam = string | number | boolean | null;
export type ExecuteResult = {
  changes: number;
  lastInsertId: number | null;
};

const resolveDbDriver = (): DbDriver => {
  const raw = (loadServerEnvValue("DB_DRIVER") || process.env.DB_DRIVER || "sqlite").trim().toLowerCase();
  return raw === "mysql" ? "mysql" : "sqlite";
};

export const getDbDriver = (): DbDriver => resolveDbDriver();

const resolveDbPath = () => {
  const findExistingDbPath = () => {
    const candidates = new Set<string>();
    const cwd = process.cwd();
    const pwd = process.env.PWD || "";

    [cwd, pwd].filter(Boolean).forEach((base) => {
      candidates.add(path.join(base, "sqlite.db"));
      candidates.add(path.join(base, "frontend", "sqlite.db"));
      candidates.add(path.join(base, "ai-chat", "frontend", "sqlite.db"));
    });

    let current = cwd;
    while (current && current !== path.dirname(current)) {
      candidates.add(path.join(current, "sqlite.db"));
      candidates.add(path.join(current, "frontend", "sqlite.db"));
      current = path.dirname(current);
    }

    for (const candidate of Array.from(candidates)) {
      if (fs.existsSync(candidate)) return candidate;
    }

    return "";
  };

  if (process.env.NODE_ENV === "production") {
    const sqliteEnvPath = (loadServerEnvValue("SQLITE_DB_PATH") || "").trim();
    if (sqliteEnvPath) {
      return path.isAbsolute(sqliteEnvPath) ? sqliteEnvPath : path.join(process.cwd(), sqliteEnvPath);
    }

    const fallbackPath = findExistingDbPath();
    if (fallbackPath) {
      console.warn(`[DB] SQLITE_DB_PATH missing in production. Falling back to detected sqlite.db at ${fallbackPath}.`);
      return fallbackPath;
    }

    throw new Error("Missing SQLITE_DB_PATH in production and no local sqlite.db fallback found.");
  }

  const envPath = (process.env.SQLITE_DB_PATH || process.env.DB_PATH || "").trim();
  if (envPath) {
    return path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath);
  }
  return path.join(process.cwd(), "sqlite.db");
};

const ensureDbDir = (dbFilePath: string) => {
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const globalForDb = global as unknown as {
  dbInstance: DatabaseInstance | undefined;
  isInitialized: boolean | undefined;
  mysqlPool: Pool | undefined;
};
const mysqlTxConnectionStorage = new AsyncLocalStorage<PoolConnection>();

const initializeSchema = (db: DatabaseInstance) => {
  initializeConversationSchema(db);
  initializeAuthSchema(db);
  initializeAnalyticsSchema(db);
  migrateLegacyStatsDb(db);
  initializeFeatureSchema(db);
};

export const getDb = () => {
  if (getDbDriver() === "mysql") {
    throw new Error("getDb() is sqlite-only. Use async query helpers when DB_DRIVER=mysql.");
  }
  if (!globalForDb.dbInstance) {
    const dbPath = resolveDbPath();
    console.info(`[DB] SQLite path: ${dbPath}`);
    ensureDbDir(dbPath);
    globalForDb.dbInstance = new Database(dbPath);
    initializeSchema(globalForDb.dbInstance);
    globalForDb.isInitialized = true;
  } else if (!globalForDb.isInitialized) {
    initializeSchema(globalForDb.dbInstance);
    globalForDb.isInitialized = true;
  }
  return globalForDb.dbInstance;
};

const getMysqlPool = () => {
  if (globalForDb.mysqlPool) return globalForDb.mysqlPool;

  const mysqlUrl = (loadServerEnvValue("MYSQL_URL") || process.env.MYSQL_URL || "").trim();
  if (mysqlUrl) {
    globalForDb.mysqlPool = mysql.createPool({
      uri: mysqlUrl,
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_POOL_SIZE || 10),
      queueLimit: 0,
      charset: "utf8mb4",
      namedPlaceholders: false,
    });
    return globalForDb.mysqlPool;
  }

  const host = (loadServerEnvValue("MYSQL_HOST") || process.env.MYSQL_HOST || "").trim();
  const user = (loadServerEnvValue("MYSQL_USER") || process.env.MYSQL_USER || "").trim();
  const database = (loadServerEnvValue("MYSQL_DATABASE") || process.env.MYSQL_DATABASE || "").trim();

  if (!host || !user || !database) {
    throw new Error("MYSQL config missing. Set MYSQL_URL or MYSQL_HOST/MYSQL_USER/MYSQL_DATABASE.");
  }

  globalForDb.mysqlPool = mysql.createPool({
    host,
    port: Number(loadServerEnvValue("MYSQL_PORT") || process.env.MYSQL_PORT || 3306),
    user,
    password: loadServerEnvValue("MYSQL_PASSWORD") || process.env.MYSQL_PASSWORD || "",
    database,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_POOL_SIZE || 10),
    queueLimit: 0,
    charset: "utf8mb4",
    namedPlaceholders: false,
  });
  return globalForDb.mysqlPool;
};

export async function queryAll<T = any>(sql: string, params: SqlParam[] = []): Promise<T[]> {
  if (getDbDriver() === "sqlite") {
    const db = getDb();
    return db.prepare(sql).all(...params) as T[];
  }

  const txConn = mysqlTxConnectionStorage.getStore();
  const [rows] = txConn ? await txConn.query(sql, params) : await getMysqlPool().query(sql, params);
  return rows as T[];
}

export async function queryOne<T = any>(sql: string, params: SqlParam[] = []): Promise<T | undefined> {
  const rows = await queryAll<T>(sql, params);
  return rows[0];
}

export async function execute(sql: string, params: SqlParam[] = []): Promise<ExecuteResult> {
  if (getDbDriver() === "sqlite") {
    const db = getDb();
    const result = db.prepare(sql).run(...params);
    return {
      changes: Number(result.changes || 0),
      lastInsertId: result.lastInsertRowid == null ? null : Number(result.lastInsertRowid),
    };
  }

  const txConn = mysqlTxConnectionStorage.getStore();
  const [result] = txConn ? await txConn.execute(sql, params) : await getMysqlPool().execute(sql, params);
  const casted = result as { affectedRows?: number; insertId?: number };
  return {
    changes: Number(casted.affectedRows || 0),
    lastInsertId: casted.insertId == null ? null : Number(casted.insertId),
  };
}

export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  if (getDbDriver() === "sqlite") {
    const db = getDb();
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = await fn();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  const pool = getMysqlPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await mysqlTxConnectionStorage.run(conn, fn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
