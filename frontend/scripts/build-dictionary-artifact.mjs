import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const cwd = process.cwd();
const srcPath = path.join(cwd, "sqlite.db");
const outPath = path.join(cwd, "dictionary-artifact.sqlite.db");

if (!fs.existsSync(srcPath)) {
  throw new Error(`Source DB not found: ${srcPath}`);
}

if (fs.existsSync(outPath)) {
  fs.unlinkSync(outPath);
}

const src = new Database(srcPath, { readonly: true });
const out = new Database(outPath);

function tableExists(db, tableName) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1")
    .get(tableName);
  return Boolean(row);
}

function ensureSchema(db) {
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
  db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_entries_word_nocase ON dictionary_entries(word COLLATE NOCASE)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_entries_frq ON dictionary_entries(frq)");
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
  db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_examples_word_nocase ON dictionary_examples(word COLLATE NOCASE)");
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
  db.exec(
    `CREATE TABLE IF NOT EXISTS dictionary_phrase_entries (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       phrase TEXT NOT NULL,
       normalized_phrase TEXT NOT NULL,
       translation TEXT,
       definition TEXT,
       meanings_json TEXT,
       pos TEXT,
       direction TEXT NOT NULL DEFAULT 'en2zh',
       source TEXT DEFAULT 'phrase-dataset',
       quality REAL DEFAULT 0.8,
       updated_at TEXT NOT NULL
     )`
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_phrase_normalized ON dictionary_phrase_entries(normalized_phrase)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_phrase_direction ON dictionary_phrase_entries(direction)");
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_dictionary_phrase_unique ON dictionary_phrase_entries(normalized_phrase, translation, source)"
  );
  db.exec(
    `CREATE TABLE IF NOT EXISTS dictionary_sources (
       source_name TEXT PRIMARY KEY,
       kind TEXT NOT NULL,
       version TEXT,
       imported_at TEXT NOT NULL,
       entry_count INTEGER DEFAULT 0,
       note TEXT
     )`
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_sources_kind ON dictionary_sources(kind)");
}

function copyTable(tableName, columns) {
  if (!tableExists(src, tableName)) return 0;
  const cols = columns.join(", ");
  out.exec(`ATTACH DATABASE '${srcPath.replace(/'/g, "''")}' AS srcdb`);
  try {
    out.exec(`INSERT OR REPLACE INTO ${tableName} (${cols}) SELECT ${cols} FROM srcdb.${tableName}`);
  } finally {
    out.exec("DETACH DATABASE srcdb");
  }
  const row = out.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get();
  return Number(row?.count || 0);
}

try {
  ensureSchema(out);

  const english = copyTable("dictionary_entries", [
    "word",
    "phonetic",
    "definition",
    "translation",
    "pos",
    "collins",
    "oxford",
    "tag",
    "bnc",
    "frq",
    "exchange",
    "detail",
    "audio",
    "source",
    "updated_at",
  ]);
  const zh = copyTable("dictionary_zh_entries", [
    "id",
    "traditional",
    "simplified",
    "pinyin",
    "english",
    "source",
    "updated_at",
  ]);
  const examples = copyTable("dictionary_examples", [
    "id",
    "word",
    "english",
    "chinese",
    "source",
    "created_at",
  ]);
  const sources = copyTable("dictionary_sources", [
    "source_name",
    "kind",
    "version",
    "imported_at",
    "entry_count",
    "note",
  ]);
  const phrases = copyTable("dictionary_phrase_entries", [
    "id",
    "phrase",
    "normalized_phrase",
    "translation",
    "definition",
    "meanings_json",
    "pos",
    "direction",
    "source",
    "quality",
    "updated_at",
  ]);

  console.log(`[dictionary-artifact] done -> ${outPath}`);
  console.log(`[dictionary-artifact] dictionary_entries=${english}`);
  console.log(`[dictionary-artifact] dictionary_zh_entries=${zh}`);
  console.log(`[dictionary-artifact] dictionary_examples=${examples}`);
  console.log(`[dictionary-artifact] dictionary_phrase_entries=${phrases}`);
  console.log(`[dictionary-artifact] dictionary_sources=${sources}`);
} finally {
  src.close();
  out.close();
}
