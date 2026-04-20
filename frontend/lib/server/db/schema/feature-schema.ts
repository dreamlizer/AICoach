import type { DatabaseInstance } from "../core";

export function initializeFeatureSchema(db: DatabaseInstance) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS user_profiles (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       tags TEXT NOT NULL,
       personality TEXT NOT NULL,
       leadership_level TEXT NOT NULL,
       last_updated TEXT NOT NULL
     )`
  );

  db.exec(
    `CREATE TABLE IF NOT EXISTS assessments (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id INTEGER NOT NULL,
       type TEXT NOT NULL,
       title TEXT,
       result TEXT NOT NULL,
       metadata TEXT,
       created_at TEXT NOT NULL
    )`
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_assessments_user ON assessments(user_id)");

  db.exec(
    `CREATE TABLE IF NOT EXISTS winlinez_scores (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id INTEGER NOT NULL,
       score INTEGER NOT NULL,
       lines_cleared INTEGER DEFAULT 0,
       balls_cleared INTEGER DEFAULT 0,
       moves_played INTEGER DEFAULT 0,
       piece_style TEXT DEFAULT 'orb',
       metadata TEXT,
       created_at TEXT NOT NULL
    )`
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_winlinez_scores_user ON winlinez_scores(user_id, created_at DESC)");

  db.exec(
    `CREATE TABLE IF NOT EXISTS pikachu_volleyball_scores (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id INTEGER NOT NULL,
       p1_score INTEGER NOT NULL,
       p2_score INTEGER NOT NULL,
       winning_score INTEGER NOT NULL,
       difficulty TEXT NOT NULL,
       theme_id TEXT NOT NULL,
       theme_preview_src TEXT NOT NULL,
       metadata TEXT,
       created_at TEXT NOT NULL
    )`
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_pv_scores_user ON pikachu_volleyball_scores(user_id, created_at DESC)");

  db.exec(
    `CREATE TABLE IF NOT EXISTS dictionary_entries (
       word TEXT PRIMARY KEY,
       phonetic TEXT,
       definition TEXT,
       translation TEXT,
       pos TEXT,
       collins INTEGER DEFAULT 0,
       oxford INTEGER DEFAULT 0,
       tag TEXT,
       bnc INTEGER DEFAULT 0,
       frq INTEGER DEFAULT 0,
       exchange TEXT,
       detail TEXT,
       audio TEXT,
       source TEXT DEFAULT 'ecdict',
       updated_at TEXT NOT NULL
     )`
  );
  db.exec(
    `CREATE TABLE IF NOT EXISTS dictionary_examples (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       word TEXT NOT NULL,
       english TEXT NOT NULL,
       chinese TEXT,
       source TEXT DEFAULT 'manual',
       created_at TEXT NOT NULL
     )`
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_examples_word ON dictionary_examples(word)");
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_dictionary_examples_unique ON dictionary_examples(word, english, source)"
  );
  db.exec(
    `CREATE TABLE IF NOT EXISTS dictionary_zh_entries (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       traditional TEXT NOT NULL,
       simplified TEXT NOT NULL,
       pinyin TEXT,
       english TEXT NOT NULL,
       source TEXT DEFAULT 'cc-cedict',
       updated_at TEXT NOT NULL
     )`
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_zh_simplified ON dictionary_zh_entries(simplified)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_zh_traditional ON dictionary_zh_entries(traditional)");
}
