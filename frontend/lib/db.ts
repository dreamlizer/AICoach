import path from "path";
import { UserProfile } from "./types";

type DatabaseStatement = {
  all: (...args: unknown[]) => unknown[];
  get: (...args: unknown[]) => unknown;
  run: (...args: unknown[]) => unknown;
};

type DatabaseSync = {
  exec: (sql: string) => void;
  prepare: (sql: string) => DatabaseStatement;
};

const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: new (path: string) => DatabaseSync };

const dbPath = path.join(process.cwd(), "sqlite.db");

// Use a global variable to store the database instance in development
// to prevent multiple connections during hot reloading
const globalForDb = global as unknown as { dbInstance: DatabaseSync | undefined };

export const getDb = () => {
  if (!globalForDb.dbInstance) {
    globalForDb.dbInstance = new DatabaseSync(dbPath);
    
    // Initialize tables only once when connection is established
    initializeSchema(globalForDb.dbInstance);
  }
  return globalForDb.dbInstance;
};

const initializeSchema = (db: DatabaseSync) => {
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
export const createConversation = (id: string, title: string, toolId: string | null = null) => {
  const db = getDb();
  // Check if exists
  const exists = db.prepare("SELECT 1 FROM conversations WHERE id = ?").get(id);
  if (!exists) {
    const now = new Date().toISOString();
    const stmt = db.prepare("INSERT INTO conversations (id, title, created_at, updated_at, tool_id) VALUES (?, ?, ?, ?, ?)");
    stmt.run(id, title, now, now, toolId);
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
export const getConversationsFromDb = () => {
  const db = getDb();
  // Sort by updated_at DESC (recently active first)
  const stmt = db.prepare("SELECT id, title, created_at, updated_at, tool_id FROM conversations ORDER BY updated_at DESC");
  return stmt.all() as { id: string; title: string; created_at: string; updated_at: string; tool_id: string | null }[];
};

// Helper to save a message
export const saveMessageToDb = (
  conversationId: string, 
  role: "user" | "ai", 
  content: string,
  kind: "text" | "analysis" = "text",
  metadata: string | null = null
) => {
  const db = getDb();
  
  // Ensure conversation exists. If not, create it with a default title or snippet.
  // In a real app, we might want to generate a title from the first message.
  const exists = db.prepare("SELECT 1 FROM conversations WHERE id = ?").get(conversationId);
  if (!exists) {
      // Create a default title using the first 20 chars of content if it's a user message, else "New Chat"
      const title = role === 'user' ? (content.slice(0, 20) + (content.length > 20 ? "..." : "")) : "New Chat";
      createConversation(conversationId, title);
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
