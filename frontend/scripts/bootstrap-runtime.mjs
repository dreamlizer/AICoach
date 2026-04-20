import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import Database from "better-sqlite3";

const cwd = process.cwd();
const dictionaryDbConfigured = process.env.SQLITE_DICTIONARY_DB_PATH || "dictionary-data.sqlite.db";
const dbPath = path.isAbsolute(dictionaryDbConfigured)
  ? dictionaryDbConfigured
  : path.join(cwd, dictionaryDbConfigured);

const dataFiles = {
  ecdict: path.join(cwd, "data", "ecdict.csv"),
  wiktionary: path.join(cwd, "data", "wiktionary-en.jsonl"),
  cedict: path.join(cwd, "data", "cedict_1_0_ts_utf-8_mdbg.txt.gz"),
  examples: path.join(cwd, "data", "cmn_sen_db_2.tsv"),
};
const englishSourcePreference = (process.env.DICTIONARY_EN_SOURCE || "ecdict").toLowerCase();

const minimums = {
  dictionaryEntries: 100000,
  chineseEntries: 20000,
  examples: 5000,
  phrases: 5000,
};

function tableExists(db, tableName) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
    .get(tableName);
  return Boolean(row);
}

function getCount(db, tableName) {
  if (!tableExists(db, tableName)) return 0;
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get();
  return Number(row?.count || 0);
}

function runScript(scriptName, args = []) {
  const scriptPath = path.join(cwd, "scripts", scriptName);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd,
    env: {
      ...process.env,
      SQLITE_DB_PATH: dbPath,
      SQLITE_DICTIONARY_DB_PATH: dbPath,
    },
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`[bootstrap-runtime] Failed while running ${scriptName}`);
  }
}

function main() {
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath);

  try {
    const dictionaryEntries = getCount(db, "dictionary_entries");
    const chineseEntries = getCount(db, "dictionary_zh_entries");
    const exampleEntries = getCount(db, "dictionary_examples");
    const phraseEntries = getCount(db, "dictionary_phrase_entries");

    console.log(
      `[bootstrap-runtime] dictionary_entries=${dictionaryEntries}, dictionary_zh_entries=${chineseEntries}, dictionary_examples=${exampleEntries}, dictionary_phrase_entries=${phraseEntries}`
    );

    let needEnglish = dictionaryEntries < minimums.dictionaryEntries;
    let needChinese = chineseEntries < minimums.chineseEntries;
    let needExamples = exampleEntries < minimums.examples;
    let needPhrases = phraseEntries < minimums.phrases;

    db.close();

    if (!needEnglish && !needChinese && !needExamples && !needPhrases) {
      console.log("[bootstrap-runtime] Dictionary data looks complete. Skipping bootstrap.");
      return;
    }

    console.log("[bootstrap-runtime] Incomplete dictionary data detected. Bootstrapping local datasets...");

    if (needEnglish) {
      const preferWiktionary = englishSourcePreference === "wiktionary" && fs.existsSync(dataFiles.wiktionary);
      if (preferWiktionary) {
        runScript("import-wiktionary-jsonl.mjs");
      } else if (fs.existsSync(dataFiles.ecdict)) {
        runScript("import-ecdict.mjs", ["ecdict.csv"]);
      } else if (fs.existsSync(dataFiles.wiktionary)) {
        runScript("import-wiktionary-jsonl.mjs");
      } else {
        throw new Error(
          `[bootstrap-runtime] Missing english dictionary source. Expected one of: ${dataFiles.ecdict} or ${dataFiles.wiktionary}`
        );
      }
    }

    if (needChinese) {
      if (!fs.existsSync(dataFiles.cedict)) {
        throw new Error(`[bootstrap-runtime] Missing dictionary source: ${dataFiles.cedict}`);
      }
      runScript("import-cc-cedict.mjs");
    }

    if (needExamples) {
      if (!fs.existsSync(dataFiles.examples)) {
        throw new Error(`[bootstrap-runtime] Missing example source: ${dataFiles.examples}`);
      }
      runScript("import-example-sentences.mjs");
    }

    if (needPhrases) {
      runScript("import-phrase-entries.mjs");
    }

    console.log("[bootstrap-runtime] Dictionary bootstrap completed.");
  } catch (error) {
    try {
      db.close();
    } catch {}
    throw error;
  }
}

main();
