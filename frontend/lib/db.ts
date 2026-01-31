import path from "path";
import { DatabaseSync } from "node:sqlite";
import { UserProfile } from "./types";

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
       id INTEGER PRIMARY KEY, 
       title TEXT NOT NULL, 
       created_at TEXT NOT NULL
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
    console.error("Schema migration error:", e);
  }
};

// Helper to save a message
export const saveMessageToDb = (conversationId: string, role: "user" | "ai", content: string) => {
  const db = getDb();
  const stmt = db.prepare("INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)");
  stmt.run(conversationId, role, content, new Date().toISOString());
};

// Helper to get recent messages
export const getMessagesFromDb = (conversationId: string, limit: number = 10) => {
  const db = getDb();
  // Get last N messages for specific conversation, then reverse to chronological order
  const stmt = db.prepare(`SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?`);
  const rows = stmt.all(conversationId, limit);
  return (rows as { role: string; content: string }[]).reverse();
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
