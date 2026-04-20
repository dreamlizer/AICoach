import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { loadServerEnvValue } from "@/lib/server/chat/env";
import { getDictionaryRuntimeConfig, getDictionaryRuntimeDefaultDbPath } from "@/lib/server/dictionary/runtime-config";

type DictionaryDbInstance = import("better-sqlite3").Database;
export type DictionaryCounts = {
  englishCount: number;
  chineseCount: number;
  exampleCount: number;
  phraseCount: number;
};

export type DictionarySourceRow = {
  source_name: string;
  kind: string;
  version: string | null;
  imported_at: string;
  entry_count: number;
  note: string | null;
};

const globalForDictionaryDb = global as unknown as {
  dictionaryDbInstance: DictionaryDbInstance | undefined;
  dictionaryDbInitialized: boolean | undefined;
  dictionaryCountsCache: DictionaryCounts | undefined;
  dictionaryCountsCachedAt: number | undefined;
};

function ensureDbDir(dbFilePath: string) {
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getDictionaryTableCount(dbPath: string, tableName: string) {
  if (!fs.existsSync(dbPath)) return 0;

  const db = new Database(dbPath, { readonly: true });
  try {
    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
      .get(tableName);
    if (!table) return 0;
    const row = db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get() as { count?: number } | undefined;
    return Number(row?.count || 0);
  } catch {
    return 0;
  } finally {
    db.close();
  }
}

type DictionaryProfile = {
  path: string;
  exists: boolean;
  englishCount: number;
  chineseCount: number;
  exampleCount: number;
  phraseCount: number;
  tier: number;
  total: number;
};

function getDictionaryProfile(candidatePath: string): DictionaryProfile {
  const exists = fs.existsSync(candidatePath);
  if (!exists) {
    return {
      path: candidatePath,
      exists: false,
      englishCount: 0,
      chineseCount: 0,
      exampleCount: 0,
      phraseCount: 0,
      tier: 0,
      total: 0,
    };
  }

  const englishCount = getDictionaryTableCount(candidatePath, "dictionary_entries");
  const chineseCount = getDictionaryTableCount(candidatePath, "dictionary_zh_entries");
  const exampleCount = getDictionaryTableCount(candidatePath, "dictionary_examples");
  const phraseCount = getDictionaryTableCount(candidatePath, "dictionary_phrase_entries");
  const total = englishCount + chineseCount + exampleCount + phraseCount;

  // Tier policy:
  // 4 = complete bilingual dictionary (preferred)
  // 3 = strong English-centric dictionary
  // 2 = Chinese-centric dictionary
  // 1 = any partial dictionary payload
  // 0 = empty/invalid
  let tier = 0;
  if (englishCount >= 100_000 && chineseCount >= 20_000) tier = 4;
  else if (englishCount >= 50_000) tier = 3;
  else if (chineseCount >= 50_000) tier = 2;
  else if (englishCount > 0 || chineseCount > 0 || exampleCount > 0) tier = 1;

  return {
    path: candidatePath,
    exists: true,
    englishCount,
    chineseCount,
    exampleCount,
    phraseCount,
    tier,
    total,
  };
}

function findExistingDictionaryDbPath() {
  const cwd = process.cwd();
  const candidates = new Set<string>([
    path.join(cwd, "dictionary-artifact.sqlite.db"),
    path.join(cwd, "dictionary-data.sqlite.db"),
    path.join(cwd, "dictionary.sqlite.db"),
    path.join(cwd, "sqlite.dictionary.db"),
    path.join(cwd, "frontend", "dictionary-data.sqlite.db"),
    path.join(cwd, "frontend", "dictionary.sqlite.db"),
    path.join(cwd, "frontend", "dictionary-artifact.sqlite.db"),
  ]);

  let current = cwd;
  while (current && current !== path.dirname(current)) {
    candidates.add(path.join(current, "dictionary.sqlite.db"));
    current = path.dirname(current);
  }

  const orderedCandidates = Array.from(candidates);
  const profiles = orderedCandidates.map((candidate) => getDictionaryProfile(candidate));
  const existingProfiles = profiles.filter((profile) => profile.exists);
  const ranked = existingProfiles.sort((a, b) => {
    if (b.tier !== a.tier) return b.tier - a.tier;
    if (b.total !== a.total) return b.total - a.total;
    return orderedCandidates.indexOf(a.path) - orderedCandidates.indexOf(b.path);
  });

  if (ranked.length > 0) {
    return ranked[0].path;
  }

  return path.join(cwd, "dictionary-artifact.sqlite.db");
}

function resolveDictionaryDbPath() {
  const configuredPath =
    loadServerEnvValue("SQLITE_DICTIONARY_DB_PATH") ||
    process.env.SQLITE_DICTIONARY_DB_PATH ||
    "";

  if (configuredPath.trim()) {
    return path.isAbsolute(configuredPath) ? configuredPath : path.join(process.cwd(), configuredPath);
  }

  const runtimeConfig = getDictionaryRuntimeConfig();
  if (runtimeConfig.profile === "cloud") {
    return getDictionaryRuntimeDefaultDbPath();
  }

  const discovered = findExistingDictionaryDbPath();
  if (discovered) return discovered;

  return getDictionaryRuntimeDefaultDbPath();
}

function initializeDictionarySchema(db: DictionaryDbInstance) {
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
  db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_entries_word_frq ON dictionary_entries(word COLLATE NOCASE, frq DESC)");
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
  db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_examples_word_id ON dictionary_examples(word COLLATE NOCASE, id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_examples_chinese ON dictionary_examples(chinese)");
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
  db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_zh_simplified_id ON dictionary_zh_entries(simplified, id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_zh_traditional_id ON dictionary_zh_entries(traditional, id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_zh_english ON dictionary_zh_entries(english)");
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
  db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_phrase_quality ON dictionary_phrase_entries(quality DESC)");
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

function tuneDictionaryDb(db: DictionaryDbInstance) {
  try {
    db.pragma("journal_mode = WAL");
  } catch {}
  try {
    db.pragma("synchronous = NORMAL");
  } catch {}
  try {
    db.pragma("temp_store = MEMORY");
  } catch {}
  try {
    // Negative means size in KiB. ~20MB cache for dictionary-heavy reads.
    db.pragma("cache_size = -20000");
  } catch {}
}

export function getDictionaryDb() {
  if (!globalForDictionaryDb.dictionaryDbInstance) {
    const dbPath = resolveDictionaryDbPath();
    console.info(`[DictionaryDB] SQLite path: ${dbPath}`);
    ensureDbDir(dbPath);
    globalForDictionaryDb.dictionaryDbInstance = new Database(dbPath);
    tuneDictionaryDb(globalForDictionaryDb.dictionaryDbInstance);
    initializeDictionarySchema(globalForDictionaryDb.dictionaryDbInstance);
    globalForDictionaryDb.dictionaryDbInitialized = true;
  } else if (!globalForDictionaryDb.dictionaryDbInitialized) {
    initializeDictionarySchema(globalForDictionaryDb.dictionaryDbInstance);
    globalForDictionaryDb.dictionaryDbInitialized = true;
  }

  return globalForDictionaryDb.dictionaryDbInstance;
}

export function getDictionaryDbPath() {
  return resolveDictionaryDbPath();
}

function getCount(db: DictionaryDbInstance, tableName: string) {
  try {
    const row = db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get() as { count?: number } | undefined;
    return Number(row?.count || 0);
  } catch {
    return 0;
  }
}

export function getDictionaryCounts(options?: { force?: boolean; ttlMs?: number }): DictionaryCounts {
  const ttlMs = Math.max(0, Number(options?.ttlMs ?? 60_000));
  const now = Date.now();
  if (!options?.force && globalForDictionaryDb.dictionaryCountsCache && globalForDictionaryDb.dictionaryCountsCachedAt) {
    if (now - globalForDictionaryDb.dictionaryCountsCachedAt <= ttlMs) {
      return globalForDictionaryDb.dictionaryCountsCache;
    }
  }

  const db = getDictionaryDb();
  const counts = {
    englishCount: getCount(db, "dictionary_entries"),
    chineseCount: getCount(db, "dictionary_zh_entries"),
    exampleCount: getCount(db, "dictionary_examples"),
    phraseCount: getCount(db, "dictionary_phrase_entries"),
  };
  globalForDictionaryDb.dictionaryCountsCache = counts;
  globalForDictionaryDb.dictionaryCountsCachedAt = now;
  return counts;
}

export function getDictionarySources(limit = 12) {
  const db = getDictionaryDb();
  try {
    return db
      .prepare(
        `SELECT source_name, kind, version, imported_at, entry_count, note
         FROM dictionary_sources
         ORDER BY imported_at DESC
         LIMIT ?`
      )
      .all(limit) as DictionarySourceRow[];
  } catch {
    return [] as DictionarySourceRow[];
  }
}

export function resetDictionaryDb() {
  try {
    globalForDictionaryDb.dictionaryDbInstance?.close();
  } catch {}
  globalForDictionaryDb.dictionaryDbInstance = undefined;
  globalForDictionaryDb.dictionaryDbInitialized = false;
  globalForDictionaryDb.dictionaryCountsCache = undefined;
  globalForDictionaryDb.dictionaryCountsCachedAt = undefined;
}
