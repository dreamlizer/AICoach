import path from "path";
import Database from "better-sqlite3";

const cwd = process.cwd();
const configuredDbPath = process.env.SQLITE_DICTIONARY_DB_PATH || process.env.SQLITE_DB_PATH || "dictionary-data.sqlite.db";
const dbPath = path.isAbsolute(configuredDbPath) ? configuredDbPath : path.join(cwd, configuredDbPath);
const db = new Database(dbPath);

const now = new Date().toISOString();

function normalizeSpaces(text) {
  return String(text || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizePhraseKey(text) {
  return normalizeSpaces(text)
    .toLowerCase()
    .replace(/^[\s"'`“”‘’.,!?;:()\-_/\\]+/, "")
    .replace(/[\s"'`“”‘’.,!?;:()\-_/\\]+$/, "");
}

function splitGlosses(value) {
  return normalizeSpaces(value)
    .replace(/^\/+|\/+$/g, "")
    .split(/[\/|;；]+/)
    .map((item) => normalizeSpaces(item))
    .filter(Boolean);
}

function inferPosFromGloss(gloss) {
  const text = normalizeSpaces(gloss).toLowerCase();
  if (!text) return null;
  if (text.startsWith("to ")) return "v";
  if (/^(a|an|the)\s+[a-z]/.test(text)) return "n";
  if (text.endsWith("ly")) return "adv";
  return null;
}

function normalizeGlossToPhrase(gloss) {
  return normalizeSpaces(gloss)
    .replace(/^\([^)]*\)\s*/, "")
    .replace(/^to\s+/i, "")
    .replace(/^(a|an|the)\s+/i, "");
}

function isPhrase(text) {
  return /^[a-z][a-z0-9' -]{1,79}$/i.test(text) && text.includes(" ");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS dictionary_phrase_entries (
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
  );
`);
db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_phrase_normalized ON dictionary_phrase_entries(normalized_phrase)");
db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_phrase_direction ON dictionary_phrase_entries(direction)");
db.exec(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_dictionary_phrase_unique ON dictionary_phrase_entries(normalized_phrase, translation, source)"
);
db.exec(`
  CREATE TABLE IF NOT EXISTS dictionary_sources (
    source_name TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    version TEXT,
    imported_at TEXT NOT NULL,
    entry_count INTEGER DEFAULT 0,
    note TEXT
  );
`);

const insertPhrase = db.prepare(`
  INSERT INTO dictionary_phrase_entries (
    phrase, normalized_phrase, translation, definition, meanings_json, pos, direction, source, quality, updated_at
  ) VALUES (
    @phrase, @normalized_phrase, @translation, @definition, @meanings_json, @pos, @direction, @source, @quality, @updated_at
  )
  ON CONFLICT(normalized_phrase, translation, source) DO UPDATE SET
    definition = excluded.definition,
    meanings_json = excluded.meanings_json,
    pos = COALESCE(excluded.pos, dictionary_phrase_entries.pos),
    quality = MAX(dictionary_phrase_entries.quality, excluded.quality),
    updated_at = excluded.updated_at
`);

const deleteBySource = db.prepare("DELETE FROM dictionary_phrase_entries WHERE source = ?");

const importFromEnglishEntries = db.transaction(() => {
  deleteBySource.run("ecdict-phrases");
  deleteBySource.run("wiktionary-phrases");
  const rows = db
    .prepare(
      `SELECT word, translation, definition, pos, source
       FROM dictionary_entries
       WHERE word LIKE '% %'
         AND word IS NOT NULL
         AND trim(word) <> ''`
    )
    .all();

  let count = 0;
  for (const row of rows) {
    const phrase = normalizeSpaces(row.word);
    const key = normalizePhraseKey(phrase);
    if (!isPhrase(phrase) || !key) continue;
    const meanings = splitGlosses(row.translation || row.definition || "").slice(0, 10);
    insertPhrase.run({
      phrase,
      normalized_phrase: key,
      translation: normalizeSpaces(row.translation || "") || null,
      definition: normalizeSpaces(row.definition || "") || null,
      meanings_json: JSON.stringify(meanings),
      pos: normalizeSpaces(row.pos || "") || null,
      direction: "en2zh",
      source: row.source === "wiktionary" ? "wiktionary-phrases" : "ecdict-phrases",
      quality: row.source === "wiktionary" ? 0.88 : 0.92,
      updated_at: now,
    });
    count += 1;
  }
  return count;
});

const importFromCedictGlosses = db.transaction(() => {
  deleteBySource.run("cc-cedict-phrases");
  const rows = db
    .prepare(
      `SELECT simplified, english
       FROM dictionary_zh_entries
       WHERE english LIKE '% %'
         AND english IS NOT NULL
         AND trim(english) <> ''`
    )
    .all();

  let count = 0;
  for (const row of rows) {
    const zh = normalizeSpaces(row.simplified);
    if (!zh) continue;
    const glosses = splitGlosses(row.english || "");
    for (const gloss of glosses) {
      const candidate = normalizeGlossToPhrase(gloss);
      const key = normalizePhraseKey(candidate);
      if (!isPhrase(candidate) || !key) continue;
      insertPhrase.run({
        phrase: candidate,
        normalized_phrase: key,
        translation: zh,
        definition: gloss,
        meanings_json: JSON.stringify([zh]),
        pos: inferPosFromGloss(gloss),
        direction: "en2zh",
        source: "cc-cedict-phrases",
        quality: 0.84,
        updated_at: now,
      });
      count += 1;
    }
  }
  return count;
});

const englishPhraseCount = importFromEnglishEntries();
const cedictPhraseCount = importFromCedictGlosses();
const totalCount = Number(
  db.prepare("SELECT COUNT(*) AS count FROM dictionary_phrase_entries").get()?.count || 0
);

db.prepare(
  `INSERT INTO dictionary_sources (source_name, kind, version, imported_at, entry_count, note)
   VALUES (@source_name, @kind, @version, @imported_at, @entry_count, @note)
   ON CONFLICT(source_name) DO UPDATE SET
     kind = excluded.kind,
     version = excluded.version,
     imported_at = excluded.imported_at,
     entry_count = excluded.entry_count,
     note = excluded.note`
).run({
  source_name: "phrase-dataset",
  kind: "phrase",
  version: "v1-local",
  imported_at: now,
  entry_count: totalCount,
  note: `ecdict/wiktionary phrases=${englishPhraseCount}, cedict phrases=${cedictPhraseCount}`,
});

console.log(`[import-phrase-entries] phrase rows total=${totalCount}`);
console.log(`[import-phrase-entries] imported from dictionary_entries=${englishPhraseCount}`);
console.log(`[import-phrase-entries] imported from cc-cedict glosses=${cedictPhraseCount}`);

db.close();
