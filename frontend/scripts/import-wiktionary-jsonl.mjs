import fs from "fs";
import path from "path";
import readline from "readline";
import Database from "better-sqlite3";

const cwd = process.cwd();
const jsonlPath = path.join(cwd, "data", process.argv[2] || "wiktionary-en.jsonl");
const configuredDbPath = process.env.SQLITE_DB_PATH || "sqlite.db";
const dbPath = path.isAbsolute(configuredDbPath) ? configuredDbPath : path.join(cwd, configuredDbPath);

if (!fs.existsSync(jsonlPath)) {
  console.error(`[import-wiktionary-jsonl] Missing JSONL: ${jsonlPath}`);
  process.exit(1);
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS dictionary_entries (
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
  );
`);
db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_entries_word_nocase ON dictionary_entries(word COLLATE NOCASE)");
db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_entries_frq ON dictionary_entries(frq)");
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

const insertStmt = db.prepare(`
  INSERT INTO dictionary_entries (
    word, phonetic, definition, translation, pos, collins, oxford, tag, bnc, frq, exchange, detail, audio, source, updated_at
  ) VALUES (
    @word, @phonetic, @definition, @translation, @pos, 0, 0, NULL, 0, 0, NULL, @detail, @audio, 'wiktionary', @updated_at
  )
  ON CONFLICT(word) DO UPDATE SET
    phonetic = COALESCE(excluded.phonetic, dictionary_entries.phonetic),
    definition = COALESCE(excluded.definition, dictionary_entries.definition),
    translation = COALESCE(excluded.translation, dictionary_entries.translation),
    pos = COALESCE(excluded.pos, dictionary_entries.pos),
    detail = COALESCE(excluded.detail, dictionary_entries.detail),
    audio = COALESCE(excluded.audio, dictionary_entries.audio),
    source = CASE
      WHEN dictionary_entries.source = 'ecdict' THEN dictionary_entries.source
      ELSE excluded.source
    END,
    updated_at = excluded.updated_at
`);

function pickPhonetic(item) {
  const direct = typeof item?.sound === "string" ? item.sound.trim() : "";
  if (direct) return direct;
  const pron = Array.isArray(item?.sounds) ? item.sounds : [];
  const first = pron.find((s) => typeof s?.ipa === "string" && s.ipa.trim());
  return first?.ipa?.trim() || null;
}

function pickAudio(item) {
  const pron = Array.isArray(item?.sounds) ? item.sounds : [];
  const first = pron.find((s) => typeof s?.ogg_url === "string" || typeof s?.mp3_url === "string");
  return first?.ogg_url || first?.mp3_url || null;
}

function pickPos(item) {
  if (typeof item?.pos === "string" && item.pos.trim()) return item.pos.trim();
  return null;
}

function collectGlosses(item) {
  const senses = Array.isArray(item?.senses) ? item.senses : [];
  const glosses = [];

  for (const sense of senses) {
    const direct = Array.isArray(sense?.glosses) ? sense.glosses : [];
    for (const g of direct) {
      const text = String(g || "").trim();
      if (text) glosses.push(text);
    }
  }

  return glosses.slice(0, 10);
}

const now = new Date().toISOString();
const stream = fs.createReadStream(jsonlPath, { encoding: "utf8" });
const reader = readline.createInterface({ input: stream, crlfDelay: Infinity });

let scanned = 0;
let imported = 0;
const batch = [];

const flush = () => {
  if (batch.length === 0) return;
  const tx = db.transaction((rows) => {
    for (const row of rows) insertStmt.run(row);
  });
  tx(batch.splice(0, batch.length));
};

for await (const line of reader) {
  scanned += 1;
  const trimmed = line.trim();
  if (!trimmed) continue;

  let row;
  try {
    row = JSON.parse(trimmed);
  } catch {
    continue;
  }

  const word = String(row?.word || "").trim().toLowerCase();
  if (!word || !/^[a-z][a-z0-9\s'()-]{0,79}$/i.test(word)) continue;

  const glosses = collectGlosses(row);
  if (glosses.length === 0) continue;

  const definition = glosses[0] || null;
  const translation = glosses.join("; ");
  const detail = JSON.stringify({ glosses: glosses.slice(0, 12) });

  batch.push({
    word,
    phonetic: pickPhonetic(row),
    definition,
    translation,
    pos: pickPos(row),
    detail,
    audio: pickAudio(row),
    updated_at: now,
  });

  if (batch.length >= 400) flush();
  imported += 1;
}

flush();

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
  source_name: "wiktionary-jsonl",
  kind: "english",
  version: path.basename(jsonlPath),
  imported_at: now,
  entry_count: imported,
  note: `Scanned lines=${scanned}`,
});

console.log(
  `[import-wiktionary-jsonl] Imported ${imported} rows from ${path.basename(jsonlPath)} into ${dbPath} (scanned=${scanned})`
);
