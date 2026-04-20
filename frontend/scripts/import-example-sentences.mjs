import fs from "fs";
import path from "path";
import readline from "readline";
import Database from "better-sqlite3";

const cwd = process.cwd();
const tsvPath = path.join(cwd, "data", process.argv[2] || "cmn_sen_db_2.tsv");
const configuredDbPath = process.env.SQLITE_DB_PATH || "sqlite.db";
const dbPath = path.isAbsolute(configuredDbPath) ? configuredDbPath : path.join(cwd, configuredDbPath);
const sourceName = "cmn_sen_db_2";
const perWordLimit = 8;
const maxPhraseLength = 4;

if (!fs.existsSync(tsvPath)) {
  console.error(`[import-example-sentences] Missing TSV: ${tsvPath}`);
  process.exit(1);
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS dictionary_examples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL,
    english TEXT NOT NULL,
    chinese TEXT,
    source TEXT DEFAULT 'manual',
    created_at TEXT NOT NULL
  );
`);
db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_examples_word ON dictionary_examples(word)");
db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_examples_word_nocase ON dictionary_examples(word COLLATE NOCASE)");
db.exec(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_dictionary_examples_unique ON dictionary_examples(word, english, source)"
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

const dictionaryWords = new Set(
  db
    .prepare("SELECT lower(word) AS word FROM dictionary_entries")
    .all()
    .map((row) => row.word)
);

const existingCounts = new Map(
  db
    .prepare(
      `SELECT lower(word) AS word, COUNT(*) AS count
       FROM dictionary_examples
       GROUP BY lower(word)`
    )
    .all()
    .map((row) => [row.word, Number(row.count || 0)])
);

db.prepare("DELETE FROM dictionary_examples WHERE source = ?").run(sourceName);

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO dictionary_examples (
    word,
    english,
    chinese,
    source,
    created_at
  ) VALUES (
    @word,
    @english,
    @chinese,
    @source,
    @created_at
  )
`);

const tokenizeEnglish = (sentence) => {
  const tokens = sentence.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g);
  return tokens ? [...new Set(tokens)] : [];
};

const extractDictionaryPhrases = (sentence) => {
  const tokens = sentence.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g);
  if (!tokens || tokens.length < 2) return [];

  const phrases = new Set();
  const upperBound = Math.min(maxPhraseLength, tokens.length);

  for (let size = 2; size <= upperBound; size += 1) {
    for (let start = 0; start <= tokens.length - size; start += 1) {
      const phrase = tokens.slice(start, start + size).join(" ");
      if (dictionaryWords.has(phrase)) {
        phrases.add(phrase);
      }
    }
  }

  return [...phrases];
};

const now = new Date().toISOString();
const stream = fs.createReadStream(tsvPath, { encoding: "utf8" });
const reader = readline.createInterface({ input: stream, crlfDelay: Infinity });

let lines = 0;
let inserted = 0;
const batch = [];

const flush = () => {
  if (batch.length === 0) return;
  const tx = db.transaction((rows) => {
    for (const row of rows) {
      const info = insertStmt.run(row);
      if (info.changes > 0) inserted += 1;
    }
  });
  tx(batch.splice(0, batch.length));
};

for await (const line of reader) {
  lines += 1;
  if (!line.trim()) continue;

  const [id, chinese, traditional, pinyin, english] = line.split("\t");
  if (!english || !chinese) continue;

  const normalizedEnglish = english.trim().replace(/\s+/g, " ");
  const normalizedChinese = chinese.trim().replace(/\s+/g, " ");

  if (normalizedEnglish.length < 12 || normalizedEnglish.length > 220) continue;

  const candidates = [...tokenizeEnglish(normalizedEnglish), ...extractDictionaryPhrases(normalizedEnglish)];
  for (const candidate of candidates) {
    if (!dictionaryWords.has(candidate)) continue;

    const currentCount = existingCounts.get(candidate) || 0;
    if (currentCount >= perWordLimit) continue;

    existingCounts.set(candidate, currentCount + 1);
    batch.push({
      word: candidate,
      english: normalizedEnglish,
      chinese: normalizedChinese,
      source: sourceName,
      created_at: now,
    });
  }

  if (batch.length >= 500) flush();
}

flush();

console.log(
  `[import-example-sentences] Imported ${inserted} examples from ${path.basename(tsvPath)} into ${dbPath} after scanning ${lines} lines`
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
  source_name: sourceName,
  kind: "examples",
  version: path.basename(tsvPath),
  imported_at: now,
  entry_count: inserted,
  note: `Scanned lines=${lines}`,
});
