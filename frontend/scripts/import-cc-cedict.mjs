import fs from "fs";
import path from "path";
import zlib from "zlib";
import readline from "readline";
import Database from "better-sqlite3";

const cwd = process.cwd();
const gzPath = path.join(cwd, "data", process.argv[2] || "cedict_1_0_ts_utf-8_mdbg.txt.gz");
const configuredDbPath = process.env.SQLITE_DB_PATH || "sqlite.db";
const dbPath = path.isAbsolute(configuredDbPath) ? configuredDbPath : path.join(cwd, configuredDbPath);

if (!fs.existsSync(gzPath)) {
  console.error(`[import-cc-cedict] Missing source file: ${gzPath}`);
  process.exit(1);
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS dictionary_zh_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    traditional TEXT NOT NULL,
    simplified TEXT NOT NULL,
    pinyin TEXT,
    english TEXT NOT NULL,
    source TEXT DEFAULT 'cc-cedict',
    updated_at TEXT NOT NULL
  );
`);
db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_zh_simplified ON dictionary_zh_entries(simplified)");
db.exec("CREATE INDEX IF NOT EXISTS idx_dictionary_zh_traditional ON dictionary_zh_entries(traditional)");
db.exec(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_dictionary_zh_unique ON dictionary_zh_entries(traditional, simplified, english)"
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

const insertStmt = db.prepare(`
  INSERT INTO dictionary_zh_entries (
    traditional,
    simplified,
    pinyin,
    english,
    source,
    updated_at
  ) VALUES (
    @traditional,
    @simplified,
    @pinyin,
    @english,
    'cc-cedict',
    @updated_at
  )
  ON CONFLICT(traditional, simplified, english) DO UPDATE SET
    pinyin = excluded.pinyin,
    updated_at = excluded.updated_at
`);

const gunzip = zlib.createGunzip();
const reader = readline.createInterface({
  input: fs.createReadStream(gzPath).pipe(gunzip),
  crlfDelay: Infinity,
});

const now = new Date().toISOString();
const batch = [];
let imported = 0;
let lines = 0;

const flush = () => {
  if (batch.length === 0) return;
  const tx = db.transaction((rows) => {
    for (const row of rows) insertStmt.run(row);
  });
  tx(batch.splice(0, batch.length));
};

for await (const line of reader) {
  lines += 1;
  if (!line || line.startsWith("#")) continue;

  const match = line.match(/^(\S+)\s+(\S+)\s+\[(.+?)\]\s+\/(.+)\/$/);
  if (!match) continue;

  const [, traditional, simplified, pinyin, englishRaw] = match;
  const english = englishRaw
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" / ");

  if (!simplified || !english) continue;

  batch.push({
    traditional,
    simplified,
    pinyin,
    english,
    updated_at: now,
  });

  if (batch.length >= 500) flush();
  imported += 1;
}

flush();

console.log(
  `[import-cc-cedict] Imported ${imported} entries from ${path.basename(gzPath)} into ${dbPath} after scanning ${lines} lines`
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
  source_name: "cc-cedict",
  kind: "chinese",
  version: path.basename(gzPath),
  imported_at: now,
  entry_count: imported,
  note: "CC-CEDICT import complete",
});
