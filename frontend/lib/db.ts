import path from "path";
import Database from "better-sqlite3";
import { UserProfile } from "./types";

export interface User {
  id: number;
  email: string;
  name?: string;
  avatar?: string;
  created_at: string;
  password_hash?: string;
}

// Better-sqlite3 types
type DatabaseInstance = import("better-sqlite3").Database;

const dbPath = path.join(process.cwd(), "sqlite.db");

// Use a global variable to store the database instance in development
// to prevent multiple connections during hot reloading
const globalForDb = global as unknown as { 
  dbInstance: DatabaseInstance | undefined;
  isInitialized: boolean | undefined;
};

export const getDb = () => {
  if (!globalForDb.dbInstance) {
    globalForDb.dbInstance = new Database(dbPath);
    initializeSchema(globalForDb.dbInstance);
    globalForDb.isInitialized = true;
  } else if (!globalForDb.isInitialized) {
    // Fallback: ensure schema is initialized if instance exists but flag is missing (e.g. hot reload)
    initializeSchema(globalForDb.dbInstance!);
    globalForDb.isInitialized = true;
  }
  return globalForDb.dbInstance!;
};

const initializeSchema = (db: DatabaseInstance) => {
  db.exec(
    `CREATE TABLE IF NOT EXISTS conversations (
       id TEXT PRIMARY KEY, 
       title TEXT NOT NULL, 
       created_at TEXT NOT NULL,
       updated_at TEXT NOT NULL,
       tool_id TEXT
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
  
  // New Table: User Profiles
  db.exec(
    `CREATE TABLE IF NOT EXISTS user_profiles (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       tags TEXT NOT NULL,
       personality TEXT NOT NULL,
       leadership_level TEXT NOT NULL,
       last_updated TEXT NOT NULL
     )`
  );

  // New Table: Users (for Auth)
  db.exec(
    `CREATE TABLE IF NOT EXISTS users (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       email TEXT UNIQUE NOT NULL,
       name TEXT,
       avatar TEXT,
       created_at TEXT NOT NULL
     )`
  );

  // Migration for existing users table
  try {
    const columns = db.prepare("PRAGMA table_info(users)").all() as any[];
    const hasName = columns.some(col => col.name === "name");
    if (!hasName) {
      db.exec("ALTER TABLE users ADD COLUMN name TEXT");
    }
    const hasAvatar = columns.some(col => col.name === "avatar");
    if (!hasAvatar) {
      db.exec("ALTER TABLE users ADD COLUMN avatar TEXT");
    }
    const hasPasswordHash = columns.some(col => col.name === "password_hash");
    if (!hasPasswordHash) {
      db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT");
    }
  } catch (e) {
    console.error("Schema migration error (users):", e);
  }

  // New Table: Verification Codes
  db.exec(
    `CREATE TABLE IF NOT EXISTS verification_codes (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       email TEXT NOT NULL,
       code TEXT NOT NULL,
       expires_at TEXT NOT NULL,
       created_at TEXT NOT NULL
     )`
  );
  
  // Optimize: Add indices for performance
  db.exec("CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email)");

  // New Table: User Stats (Token Usage)
  db.exec(
    `CREATE TABLE IF NOT EXISTS user_stats (
       user_id INTEGER PRIMARY KEY,
       total_tokens INTEGER DEFAULT 0,
       input_tokens INTEGER DEFAULT 0,
       output_tokens INTEGER DEFAULT 0,
       last_updated TEXT
     )`
  );

  // New Table: Tool Usage Stats
  db.exec(
    `CREATE TABLE IF NOT EXISTS tool_usage (
       user_id INTEGER,
       tool_id TEXT,
       usage_count INTEGER DEFAULT 0,
       last_used TEXT,
       PRIMARY KEY (user_id, tool_id)
     )`
  );

  // New Table: Analytics Events (Generic)
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
  
  db.exec("CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id)");

  // Check if conversation_id column exists in messages table
  try {
    const columns = db.prepare("PRAGMA table_info(messages)").all() as any[];
    const hasConversationId = columns.some(col => col.name === "conversation_id");
    
    if (!hasConversationId) {
       db.exec("ALTER TABLE messages ADD COLUMN conversation_id TEXT");
    }
  } catch (e) {
    console.error("Schema migration error (messages):", e);
  }

  // Check if updated_at column exists in conversations table
  try {
    const columns = db.prepare("PRAGMA table_info(conversations)").all() as any[];
    const hasUpdatedAt = columns.some(col => col.name === "updated_at");
    
    if (!hasUpdatedAt) {
       // Add column and backfill with created_at value
       db.exec("ALTER TABLE conversations ADD COLUMN updated_at TEXT");
       db.exec("UPDATE conversations SET updated_at = created_at WHERE updated_at IS NULL");
    }
  } catch (e) {
    console.error("Schema migration error (conversations):", e);
  }

  try {
    const columns = db.prepare("PRAGMA table_info(conversations)").all() as any[];
    const hasToolId = columns.some(col => col.name === "tool_id");
    if (!hasToolId) {
      db.exec("ALTER TABLE conversations ADD COLUMN tool_id TEXT");
    }
  } catch (e) {
    console.error("Schema migration error (conversations tool_id):", e);
  }

  // Check if user_id column exists in conversations table
  try {
    const columns = db.prepare("PRAGMA table_info(conversations)").all() as any[];
    const hasUserId = columns.some(col => col.name === "user_id");
    if (!hasUserId) {
      db.exec("ALTER TABLE conversations ADD COLUMN user_id INTEGER");
    }
  } catch (e) {
    console.error("Schema migration error (conversations user_id):", e);
  }

  // Check if kind and metadata columns exist in messages table
  try {
    const columns = db.prepare("PRAGMA table_info(messages)").all() as any[];
    const hasKind = columns.some(col => col.name === "kind");
    const hasMetadata = columns.some(col => col.name === "metadata");
    
    if (!hasKind) {
       db.exec("ALTER TABLE messages ADD COLUMN kind TEXT DEFAULT 'text'");
    }
    if (!hasMetadata) {
       db.exec("ALTER TABLE messages ADD COLUMN metadata TEXT");
    }
  } catch (e) {
    console.error("Schema migration error (messages extra columns):", e);
  }
};

// Helper to create or update a conversation
export const createConversation = (id: string, title: string, toolId: string | null = null, userId: number | null = null) => {
  const db = getDb();
  // Check if exists
  const exists = db.prepare("SELECT 1 FROM conversations WHERE id = ?").get(id);
  if (!exists) {
    const now = new Date().toISOString();
    const stmt = db.prepare("INSERT INTO conversations (id, title, created_at, updated_at, tool_id, user_id) VALUES (?, ?, ?, ?, ?, ?)");
    stmt.run(id, title, now, now, toolId, userId);
  }
};

// Helper to update conversation title
export const updateConversationTitle = (id: string, newTitle: string) => {
  const db = getDb();
  const stmt = db.prepare("UPDATE conversations SET title = ? WHERE id = ?");
  stmt.run(newTitle, id);
};

export const updateConversationTool = (id: string, toolId: string | null) => {
  const db = getDb();
  const stmt = db.prepare("UPDATE conversations SET tool_id = ? WHERE id = ?");
  stmt.run(toolId, id);
};

// Helper to get all conversations
export const getConversationsFromDb = (userId: number | null = null) => {
  const db = getDb();
  // Sort by updated_at DESC (recently active first)
  let sql = "SELECT id, title, created_at, updated_at, tool_id FROM conversations";
  const params: any[] = [];

  if (userId) {
    sql += " WHERE user_id = ?";
    params.push(userId);
  } else {
    sql += " WHERE user_id IS NULL";
  }

  sql += " ORDER BY updated_at DESC LIMIT 50";
  
  const stmt = db.prepare(sql);
  return stmt.all(...params) as { id: string; title: string; created_at: string; updated_at: string; tool_id: string | null }[];
};

export const getConversationById = (id: string) => {
  const db = getDb();
  return db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as { id: string; user_id: number | null; title: string } | undefined;
};

export const saveVerificationCode = (email: string, code: string) => {
  const db = getDb();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
  const createdAt = new Date().toISOString();
  
  db.prepare(
    "INSERT INTO verification_codes (email, code, expires_at, created_at) VALUES (?, ?, ?, ?)"
  ).run(email, code, expiresAt, createdAt);
};

export const verifyCode = (email: string, code: string): boolean => {
  const db = getDb();
  const now = new Date().toISOString();
  
  // Find valid code
  const record = db.prepare(
    "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 1"
  ).get(email, code, now) as any;
  
  if (record) {
    // Delete used code (optional, or just rely on expiration)
    // db.prepare("DELETE FROM verification_codes WHERE id = ?").run(record.id);
    return true;
  }
  return false;
};

export const getOrCreateUser = (email: string, name?: string): User => {
  const db = getDb();
  const now = new Date().toISOString();
  
  let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User | undefined;
  
  if (!user) {
    // Only used for OTP login where we might implicitly create user if we want
    // But now we prefer explicit registration. 
    // This function is kept for backward compatibility with pure OTP login if we still support it as "magic link" style
    db.prepare("INSERT INTO users (email, name, created_at) VALUES (?, ?, ?)").run(email, name || email.split('@')[0], now);
    user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User;
  } else if (name && !user.name) {
    // Backfill name if missing and provided
    db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, user.id);
    user.name = name;
  }
  
  return user;
};

export const createUserWithPassword = (email: string, passwordHash: string, name: string): User | undefined => {
  const db = getDb();
  const now = new Date().toISOString();
  
  try {
    db.prepare("INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)").run(email, passwordHash, name, now);
    return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User | undefined;
  } catch (err: any) {
    if (err.message.includes("UNIQUE constraint failed")) {
      throw new Error("User already exists");
    }
    throw err;
  }
};

export const getUserByEmail = (email: string): User | undefined => {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User | undefined;
};

export const updateUserPassword = (userId: number, passwordHash: string) => {
  const db = getDb();
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId);
};

export const updateUserProfile = (userId: number, updates: { name?: string; avatar?: string }): User | undefined => {
  const db = getDb();
  const { name, avatar } = updates;
  
  if (name !== undefined) {
    db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, userId);
  }
  if (avatar !== undefined) {
    db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(avatar, userId);
  }
  
  return db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as User | undefined;
};

// Helper to save a message
export const saveMessageToDb = (
  conversationId: string, 
  role: "user" | "ai", 
  content: string,
  kind: "text" | "analysis" = "text",
  metadata: string | null = null,
  userId: number | null = null,
  initialTitle: string | null = null,
  initialToolId: string | null = null
) => {
  const db = getDb();
  
  // Ensure conversation exists. If not, create it with a default title or snippet.
  // In a real app, we might want to generate a title from the first message.
  const conv = db.prepare("SELECT user_id FROM conversations WHERE id = ?").get(conversationId) as any;
  
  if (!conv) {
      // Use provided title or create a default one
      let title = initialTitle;
      if (!title) {
         title = role === 'user' ? (content.slice(0, 20) + (content.length > 20 ? "..." : "")) : "New Chat";
      }
      createConversation(conversationId, title, initialToolId, userId);
  } else if (userId && conv.user_id === null) {
      // Claim the conversation if it's currently anonymous and we have a user
      db.prepare("UPDATE conversations SET user_id = ? WHERE id = ?").run(userId, conversationId);
  }

  const now = new Date().toISOString();
  const stmt = db.prepare("INSERT INTO messages (conversation_id, role, content, created_at, kind, metadata) VALUES (?, ?, ?, ?, ?, ?)");
  stmt.run(conversationId, role, content, now, kind, metadata);

  // Update conversation updated_at
  const updateStmt = db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?");
  updateStmt.run(now, conversationId);
};

// Helper to get recent messages
export const getMessagesFromDb = (conversationId: string, limit: number = 10) => {
  const db = getDb();
  // Get last N messages for specific conversation, then reverse to chronological order
  const stmt = db.prepare(`SELECT id, role, content, created_at, kind, metadata FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?`);
  const rows = stmt.all(conversationId, limit);
  return (rows as { id: number; role: string; content: string; created_at: string; kind: string; metadata: string | null }[]).reverse();
};

export const countUserMessages = (conversationId: string) => {
  const db = getDb();
  const result = db.prepare("SELECT COUNT(*) as count FROM messages WHERE conversation_id = ? AND role = 'user'").get(conversationId) as { count: number };
  return result ? result.count : 0;
};

// Helper to get user profile (get the latest one)
export const getUserProfileFromDb = (): UserProfile | null => {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM user_profiles ORDER BY id DESC LIMIT 1");
  const row = stmt.get() as any;
  
  if (!row) return null;
  
  let rawTags = {};
  try {
    rawTags = JSON.parse(row.tags);
  } catch (e) {
    console.error("Failed to parse profile tags", e);
  }

  // Runtime Migration: Convert old string tags to new ProfileValue structure
  const demographics: Record<string, any> = {};
  for (const [key, val] of Object.entries(rawTags)) {
    if (typeof val === 'string') {
      // Old format: just string value
      demographics[key] = { value: val, confidence: 50 }; // Default low confidence for legacy data
    } else {
      // New format: already object
      demographics[key] = val;
    }
  }

  return {
    demographics: demographics,
    personality: row.personality,
    leadership_level: JSON.parse(row.leadership_level),
    last_updated: row.last_updated
  };
};

// Helper to delete a conversation and its messages
export const deleteConversation = (id: string) => {
  const db = getDb();
  // Delete messages first
  const deleteMessagesStmt = db.prepare("DELETE FROM messages WHERE conversation_id = ?");
  deleteMessagesStmt.run(id);

  // Delete conversation
  const deleteConvStmt = db.prepare("DELETE FROM conversations WHERE id = ?");
  deleteConvStmt.run(id);
};

export const searchMessages = (query: string, userId: number | null = null) => {
  const db = getDb();
  // Search for messages that match the query OR conversations whose title matches the query
  // We join conversations to get the title and filter by user_id if needed
  let sql = `
    SELECT 
      m.id as message_id,
      m.conversation_id,
      m.content,
      m.created_at,
      c.title as conversation_title
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE (m.content LIKE ? OR c.title LIKE ?)
  `;

  const params: any[] = [`%${query}%`, `%${query}%`];

  if (userId) {
    sql += " AND c.user_id = ?";
    params.push(userId);
  } else {
    // If no user_id, we might want to restrict to public/anonymous chats or just show all (depending on requirements)
    // For now, let's assume if userId is null, we only search anonymous chats to be safe, 
    // or maybe we just don't filter. 
    // Given the requirement "secure conversation data", we should probably filter by user ownership.
    // If userId is NOT provided (e.g. server-side context issue), we should be careful.
    // But usually this is called with a verified user ID.
    // Let's assume userId IS NULL means anonymous user, so we only search anonymous chats.
    sql += " AND c.user_id IS NULL";
  }

  sql += " ORDER BY m.created_at DESC LIMIT 50";

  const stmt = db.prepare(sql);
  return stmt.all(...params) as {
    message_id: number;
    conversation_id: string;
    content: string;
    created_at: string;
    conversation_title: string;
  }[];
};

// Helper to save user profile
export const saveUserProfileToDb = (profile: UserProfile) => {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO user_profiles (tags, personality, leadership_level, last_updated) VALUES (?, ?, ?, ?)"
  );
  stmt.run(
    JSON.stringify(profile.demographics), 
    profile.personality, 
    JSON.stringify(profile.leadership_level), 
    new Date().toISOString()
  );
};

// Helper to increment user token usage
export const incrementUserTokens = (userId: number, total: number, input: number, output: number) => {
  const db = getDb();
  const now = new Date().toISOString();
  
  // Check if stats exist
  const exists = db.prepare("SELECT 1 FROM user_stats WHERE user_id = ?").get(userId);
  
  if (exists) {
    const stmt = db.prepare(`
      UPDATE user_stats 
      SET total_tokens = total_tokens + ?, 
          input_tokens = input_tokens + ?, 
          output_tokens = output_tokens + ?, 
          last_updated = ? 
      WHERE user_id = ?
    `);
    stmt.run(total, input, output, now, userId);
  } else {
    const stmt = db.prepare(`
      INSERT INTO user_stats (user_id, total_tokens, input_tokens, output_tokens, last_updated) 
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(userId, total, input, output, now);
  }
};

// Helper to increment tool usage
export const incrementToolUsage = (userId: number, toolId: string) => {
  if (!toolId) return;
  const db = getDb();
  const now = new Date().toISOString();
  
  // Check if exists
  const exists = db.prepare("SELECT 1 FROM tool_usage WHERE user_id = ? AND tool_id = ?").get(userId, toolId);
  
  if (exists) {
    const stmt = db.prepare("UPDATE tool_usage SET usage_count = usage_count + 1, last_used = ? WHERE user_id = ? AND tool_id = ?");
    stmt.run(now, userId, toolId);
  } else {
    const stmt = db.prepare("INSERT INTO tool_usage (user_id, tool_id, usage_count, last_used) VALUES (?, ?, 1, ?)");
    stmt.run(userId, toolId, now);
  }
};

export const getUserStats = (userId: number) => {
  const db = getDb();
  const stats = db.prepare("SELECT * FROM user_stats WHERE user_id = ?").get(userId) as any;
  const tools = db.prepare("SELECT tool_id, usage_count FROM tool_usage WHERE user_id = ? ORDER BY usage_count DESC").all(userId) as any[];
  
  return {
    tokens: stats || { total_tokens: 0, input_tokens: 0, output_tokens: 0 },
    tool_usage: tools || []
  };
};

// Generic Event Tracking
export const trackEvent = (
  userId: number | null, 
  eventType: string, 
  category: string = "general", 
  data: Record<string, any> = {}
) => {
  const db = getDb();
  const now = new Date().toISOString();
  
  try {
    const stmt = db.prepare(
      "INSERT INTO analytics_events (user_id, event_type, category, event_data, created_at) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(userId, eventType, category, JSON.stringify(data), now);
  } catch (error) {
    console.error("Failed to track event:", error);
  }
};

export const getAnalyticsEvents = (limit: number = 50, userId: number | null = null) => {
  const db = getDb();
  let sql = "SELECT * FROM analytics_events";
  const params: any[] = [];

  if (userId) {
    sql += " WHERE user_id = ?";
    params.push(userId);
  }

  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);

  const stmt = db.prepare(sql);
  return stmt.all(...params);
};
