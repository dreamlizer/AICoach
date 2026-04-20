import type { DatabaseInstance } from "../core";
import { hasColumn } from "./helpers";

export function initializeAuthSchema(db: DatabaseInstance) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS users (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       email TEXT UNIQUE NOT NULL,
       name TEXT,
       avatar TEXT,
       created_at TEXT NOT NULL
     )`
  );

  try {
    if (!hasColumn(db, "users", "name")) db.exec("ALTER TABLE users ADD COLUMN name TEXT");
    if (!hasColumn(db, "users", "avatar")) db.exec("ALTER TABLE users ADD COLUMN avatar TEXT");
    if (!hasColumn(db, "users", "password_hash")) db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT");
    if (!hasColumn(db, "users", "role")) db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
    if (!hasColumn(db, "users", "feature_order_json")) db.exec("ALTER TABLE users ADD COLUMN feature_order_json TEXT");
  } catch (error) {
    console.error("Schema migration error (users):", error);
  }

  db.exec(
    `CREATE TABLE IF NOT EXISTS verification_codes (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       email TEXT NOT NULL,
       code TEXT NOT NULL,
       expires_at TEXT NOT NULL,
       created_at TEXT NOT NULL
     )`
  );
  db.exec(
    `CREATE TABLE IF NOT EXISTS login_attempts (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       email TEXT NOT NULL,
       success INTEGER NOT NULL,
       created_at TEXT NOT NULL
     )`
  );

  db.exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email)");
}
