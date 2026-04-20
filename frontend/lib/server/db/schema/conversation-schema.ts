import type { DatabaseInstance } from "../core";
import { hasColumn } from "./helpers";

const SHORT_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

const randomShortCode = (length = 8) => {
  let value = "";
  for (let i = 0; i < length; i += 1) {
    value += SHORT_CODE_CHARS[Math.floor(Math.random() * SHORT_CODE_CHARS.length)];
  }
  return value;
};

const generateUniqueShortCode = (db: DatabaseInstance) => {
  const checkStmt = db.prepare("SELECT 1 FROM conversations WHERE short_code = ? LIMIT 1");
  for (let i = 0; i < 12; i += 1) {
    const code = randomShortCode(8);
    const exists = checkStmt.get(code);
    if (!exists) return code;
  }
  return `${Date.now().toString(36).slice(-4)}${randomShortCode(4)}`;
};

export function initializeConversationSchema(db: DatabaseInstance) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS conversations (
       id TEXT PRIMARY KEY,
       title TEXT NOT NULL,
       created_at TEXT NOT NULL,
       updated_at TEXT NOT NULL,
       tool_id TEXT,
       user_id INTEGER,
       short_code TEXT
     )`
  );
  db.exec(
    `CREATE TABLE IF NOT EXISTS messages (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       conversation_id TEXT NOT NULL,
       role TEXT NOT NULL,
       content TEXT NOT NULL,
       created_at TEXT NOT NULL
     )`
  );

  try {
    if (!hasColumn(db, "messages", "conversation_id")) {
      db.exec("ALTER TABLE messages ADD COLUMN conversation_id TEXT");
    }
    if (!hasColumn(db, "messages", "kind")) {
      db.exec("ALTER TABLE messages ADD COLUMN kind TEXT DEFAULT 'text'");
    }
    if (!hasColumn(db, "messages", "metadata")) {
      db.exec("ALTER TABLE messages ADD COLUMN metadata TEXT");
    }
  } catch (error) {
    console.error("Schema migration error (messages):", error);
  }

  try {
    if (!hasColumn(db, "conversations", "updated_at")) {
      db.exec("ALTER TABLE conversations ADD COLUMN updated_at TEXT");
      db.exec("UPDATE conversations SET updated_at = created_at WHERE updated_at IS NULL");
    }
    if (!hasColumn(db, "conversations", "tool_id")) {
      db.exec("ALTER TABLE conversations ADD COLUMN tool_id TEXT");
    }
    if (!hasColumn(db, "conversations", "user_id")) {
      db.exec("ALTER TABLE conversations ADD COLUMN user_id INTEGER");
    }
    if (!hasColumn(db, "conversations", "short_code")) {
      db.exec("ALTER TABLE conversations ADD COLUMN short_code TEXT");
    }

    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_short_code ON conversations(short_code)");
    const rows = db
      .prepare("SELECT id FROM conversations WHERE short_code IS NULL OR short_code = ''")
      .all() as Array<{ id: string }>;
    const updateStmt = db.prepare("UPDATE conversations SET short_code = ? WHERE id = ?");
    rows.forEach((row) => {
      updateStmt.run(generateUniqueShortCode(db), row.id);
    });
  } catch (error) {
    console.error("Schema migration error (conversations):", error);
  }

  db.exec("CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)");
}
