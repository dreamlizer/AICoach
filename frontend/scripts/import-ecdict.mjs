import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import Database from "better-sqlite3";

const cwd = process.cwd();
const requestedCsv = process.argv[2];
const defaultCsv = fs.existsSync(path.join(cwd, "data", "ecdict.csv")) ? "ecdict.csv" : "ecdict.mini.csv";
const csvPath = path.join(cwd, "data", requestedCsv || defaultCsv);
const configuredDbPath = process.env.SQLITE_DB_PATH || "sqlite.db";
const dbPath = path.isAbsolute(configuredDbPath) ? configuredDbPath : path.join(cwd, configuredDbPath);

if (!fs.existsSync(csvPath)) {
  console.error(`[import-ecdict] Missing CSV: ${csvPath}`);
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
    @word, @phonetic, @definition, @translation, @pos, @collins, @oxford, @tag, @bnc, @frq, @exchange, @detail, @audio, 'ecdict', @updated_at
  )
  ON CONFLICT(word) DO UPDATE SET
    phonetic = excluded.phonetic,
    definition = excluded.definition,
    translation = excluded.translation,
    pos = excluded.pos,
    collins = excluded.collins,
    oxford = excluded.oxford,
    tag = excluded.tag,
    bnc = excluded.bnc,
    frq = excluded.frq,
    exchange = excluded.exchange,
    detail = excluded.detail,
    audio = excluded.audio,
    source = excluded.source,
    updated_at = excluded.updated_at
`);

const parser = fs
  .createReadStream(csvPath)
  .pipe(
    parse({
      columns: true,
      relax_quotes: true,
      relax_column_count: true,
      skip_empty_lines: true,
      bom: true,
      trim: false,
    })
  );

let count = 0;
const now = new Date().toISOString();
const importBatch = [];

for await (const row of parser) {
  const word = String(row.word || "").trim();
  if (!word) continue;

  importBatch.push({
    word,
    phonetic: String(row.phonetic || "").trim() || null,
    definition: String(row.definition || "").trim() || null,
    translation: String(row.translation || "").trim() || null,
    pos: String(row.pos || "").trim() || null,
    collins: Number(row.collins || 0) || 0,
    oxford: Number(row.oxford || 0) || 0,
    tag: String(row.tag || "").trim() || null,
    bnc: Number(row.bnc || 0) || 0,
    frq: Number(row.frq || 0) || 0,
    exchange: String(row.exchange || "").trim() || null,
    detail: String(row.detail || "").trim() || null,
    audio: String(row.audio || "").trim() || null,
    updated_at: now,
  });

  if (importBatch.length >= 500) {
    const tx = db.transaction((rows) => {
      for (const item of rows) insertStmt.run(item);
    });
    tx(importBatch.splice(0, importBatch.length));
  }

  count += 1;
}

if (importBatch.length > 0) {
  const tx = db.transaction((rows) => {
    for (const item of rows) insertStmt.run(item);
  });
  tx(importBatch);
}

console.log(`[import-ecdict] Imported ${count} entries from ${path.basename(csvPath)} into ${dbPath}`);

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
  source_name: "ecdict",
  kind: "english",
  version: path.basename(csvPath),
  imported_at: now,
  entry_count: count,
  note: "ECDICT import complete",
});
