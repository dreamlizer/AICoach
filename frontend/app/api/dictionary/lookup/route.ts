import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import Database from "better-sqlite3";
import { NextRequest, NextResponse } from "next/server";
import { type DictionaryDirection, getDictionaryEntry, searchDictionaryEntries } from "@/lib/dictionary";
import { getDictionaryRuntimeConfig } from "@/lib/server/dictionary/runtime-config";
import {
  type DictionaryCounts,
  getDictionaryCounts,
  getDictionaryDb,
  getDictionaryDbPath,
  getDictionarySources,
  resetDictionaryDb,
} from "@/lib/server/db/dictionary-core";

const MIN_COUNTS = {
  english: 100000,
  chinese: 20000,
  examples: 5000,
  phrases: 5000,
};

const CHECK_TTL_MS = 5 * 60 * 1000;
const LOOKUP_CACHE_TTL_MS = 2 * 60 * 1000;
const ZH_GLOSS_CACHE_TTL_MS = 30 * 60 * 1000;
const runtimeConfig = getDictionaryRuntimeConfig();
const ONLINE_FALLBACK_ENABLED = runtimeConfig.onlineFallbackEnabled;
const RUNTIME_BOOTSTRAP_ENABLED = runtimeConfig.runtimeBootstrapEnabled;
const REMOTE_HYDRATION_ENABLED = runtimeConfig.remoteHydrationEnabled;
let lastCountsCheckAt = 0;
let cachedCounts: DictionaryCounts | null = null;
let checkInFlight: Promise<DictionaryCounts> | null = null;
const lookupResultCache = new Map<string, { expiresAt: number; payload: any }>();
const zhGlossCache = new Map<string, { expiresAt: number; value: string | null }>();

function getTableCount(db: Database.Database, tableName: string) {
  try {
    return Number((db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get() as { count?: number } | undefined)?.count || 0);
  } catch {
    return 0;
  }
}

function getBootstrapSources() {
  const cwd = process.cwd();
  return {
    ecdict: fs.existsSync(path.join(cwd, "data", "ecdict.csv")),
    cedict: fs.existsSync(path.join(cwd, "data", "cedict_1_0_ts_utf-8_mdbg.txt.gz")),
    examples: fs.existsSync(path.join(cwd, "data", "cmn_sen_db_2.tsv")),
  };
}

function tryBootstrapDictionary() {
  const scriptPath = path.join(process.cwd(), "scripts", "bootstrap-runtime.mjs");
  if (!fs.existsSync(scriptPath)) return;

  spawnSync(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "ignore",
  });
}

function containsChinese(text: string) {
  return /[\u3400-\u9fff]/.test(text);
}

function normalizeDirection(input: string | null): DictionaryDirection {
  if (!input) return "auto";
  const value = input.trim().toLowerCase();
  if (value === "en2zh" || value === "zh2en" || value === "auto") return value;
  return "auto";
}

function collapseSpaces(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function stripEdgePunctuation(text: string) {
  return text.replace(/^[\s"'`“”‘’.,!?;:()\-_/\\]+/, "").replace(/[\s"'`“”‘’.,!?;:()\-_/\\]+$/, "");
}

function buildEnglishRewriteCandidates(rawQuery: string) {
  const normalized = collapseSpaces(stripEdgePunctuation(rawQuery.toLowerCase()));
  if (!normalized) return [] as string[];
  const candidates = new Set<string>([normalized]);

  const withoutTo = normalized.replace(/^to\s+/, "");
  if (withoutTo !== normalized && withoutTo) candidates.add(withoutTo);

  const withoutArticle = normalized.replace(/^(a|an|the)\s+/, "");
  if (withoutArticle !== normalized && withoutArticle) candidates.add(withoutArticle);

  const withoutToBe = normalized.replace(/^to\s+be\s+/, "");
  if (withoutToBe !== normalized && withoutToBe) candidates.add(withoutToBe);

  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length > 1) {
    const stop = new Set(["to", "a", "an", "the", "be", "is", "are", "am", "was", "were", "of", "for", "in", "on", "at"]);
    const coreTokens = tokens.filter((t) => !stop.has(t) && t.length >= 3);
    for (const token of coreTokens) {
      candidates.add(token);
    }
    if (coreTokens.length >= 2) {
      candidates.add(coreTokens.slice(0, 2).join(" "));
    }
  }

  return Array.from(candidates).filter(Boolean);
}

function normalizeChineseQuery(text: string) {
  return collapseSpaces(stripEdgePunctuation(text))
    .replace(/[，。！？、；：,.!?;:]/g, "")
    .trim();
}

function buildChineseRewriteCandidates(rawQuery: string) {
  const normalized = normalizeChineseQuery(rawQuery);
  if (!normalized) return [] as string[];

  const candidates = new Set<string>([normalized]);
  const withoutModifier = normalized.replace(/[的地得了着過过們们]+$/g, "");
  if (withoutModifier && withoutModifier !== normalized) candidates.add(withoutModifier);

  if (normalized.length >= 3) {
    candidates.add(normalized.slice(0, -1));
  }

  return Array.from(candidates).filter((item) => item.length >= 1);
}

function uniqueStrings(values: string[], limit = values.length) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (result.length >= limit) break;
  }
  return result;
}

function extractChineseMeaningsFromText(text: string | null | undefined) {
  if (!text) return [] as string[];
  const chunks = text
    .replace(/\r/g, "\n")
    .split(/[\n/;；,，。]+/)
    .map((item) =>
      item
        .replace(/^\s*中文[:：]?\s*/i, "")
        .replace(/^\s*(n|v|vt|vi|adj|adv|prep|conj|pron|num|int|aux)\.?\s*[:：]?\s*/i, "")
        .trim()
    )
    .filter((item) => containsChinese(item));

  return uniqueStrings(chunks, 12);
}

function readCache<T>(store: Map<string, { expiresAt: number; value: T }>, key: string) {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache<T>(store: Map<string, { expiresAt: number; value: T }>, key: string, value: T, ttlMs: number) {
  store.set(key, { expiresAt: Date.now() + ttlMs, value });
}

function readLookupPayloadCache(key: string) {
  const hit = lookupResultCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    lookupResultCache.delete(key);
    return null;
  }
  // Never reuse cached empty payloads; transient misses should not poison later lookups.
  if (!hit.payload?.entry) {
    lookupResultCache.delete(key);
    return null;
  }
  return hit.payload;
}

function writeLookupPayloadCache(key: string, payload: any) {
  if (!payload?.entry) return;
  lookupResultCache.set(key, { expiresAt: Date.now() + LOOKUP_CACHE_TTL_MS, payload });
}

function toArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function hasChineseContentInEntry(entry: any) {
  if (!entry || typeof entry !== "object") return false;
  if (typeof entry.translation === "string" && containsChinese(entry.translation)) return true;
  const meanings = toArray(entry.meanings).filter((item): item is string => typeof item === "string");
  if (meanings.some((item) => containsChinese(item))) return true;
  const definitionLayers = toArray((entry as any).definitionLayers).filter(
    (item): item is { lang?: string; text?: string } => typeof item === "object" && item !== null
  );
  return definitionLayers.some((item) => item.lang === "zh" && typeof item.text === "string" && item.text.trim().length > 0);
}

function pickFirstMeaning(entry: any) {
  const meanings = toArray(entry?.meanings).filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  );
  if (meanings.length > 0) return meanings[0];
  if (typeof entry?.definition === "string" && entry.definition.trim()) return entry.definition.trim();
  return null;
}

function prioritizeChineseMeanings(entry: any) {
  const meanings = toArray(entry?.meanings).filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  );
  const chinese = meanings.filter((item) => containsChinese(item));
  const others = meanings.filter((item) => !containsChinese(item));
  return [...chinese, ...others].slice(0, 8);
}

function isEnglishLikeQuery(query: string) {
  return /^[a-z][a-z\s\-']{0,79}$/i.test(query.trim());
}

function isLikelyPartialEnglishQuery(query: string) {
  const normalized = query.trim().toLowerCase();
  return /^[a-z]{1,5}$/.test(normalized);
}

function extractEnglishKeywords(text: string) {
  const stopwords = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "into",
    "over",
    "under",
    "about",
    "your",
    "their",
    "there",
    "which",
    "when",
    "where",
    "what",
    "will",
    "would",
    "could",
    "should",
    "have",
    "has",
    "had",
    "been",
    "being",
    "were",
    "them",
    "they",
    "than",
    "then",
    "some",
    "such",
    "also",
    "very",
  ]);
  const tokens = text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
  return uniqueStrings(tokens.filter((token) => token.length >= 4 && !stopwords.has(token)), 8);
}

function isDictionaryRichEnough(counts: DictionaryCounts) {
  // 核心可用性门槛：英/中/例句三表达到最小规模。
  // 短语库是增强层，缺失时不应阻断基础查词。
  return (
    counts.englishCount >= MIN_COUNTS.english &&
    counts.chineseCount >= MIN_COUNTS.chinese &&
    counts.exampleCount >= MIN_COUNTS.examples
  );
}

function isDictionaryUsableForQuery(query: string, counts: DictionaryCounts) {
  const hasEnglish = counts.englishCount > 0;
  const hasChinese = counts.chineseCount > 0;
  const hasEnoughEnglishForLookup = counts.englishCount >= 5_000;
  const isEnglishPhrase = isEnglishLikeQuery(query) && query.trim().includes(" ");

  if (containsChinese(query)) {
    return hasChinese;
  }

  if (isEnglishPhrase) {
    // Phrase DB is optional for availability; missing phrase rows should degrade gracefully.
    return hasEnoughEnglishForLookup;
  }

  // Avoid treating a half-imported Chinese-only DB as "English-ready".
  return hasEnglish && hasEnoughEnglishForLookup;
}

async function tryHydrateDictionaryFromRemote(dbPath: string) {
  if (!REMOTE_HYDRATION_ENABLED) return false;
  const sourceUrl = runtimeConfig.remoteDbUrl || "";
  if (!sourceUrl) return false;

  const targetDir = path.dirname(dbPath);
  const tempFile = path.join(targetDir, `dictionary-${Date.now()}.download.db`);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(sourceUrl, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) return false;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 2 * 1024 * 1024) return false;
    fs.writeFileSync(tempFile, buffer);

    // Safety guard: only accept dictionary-only DB artifacts.
    const candidateDb = new Database(tempFile, { readonly: true });
    try {
      const tables = candidateDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as Array<{ name: string }>;
      const tableNames = new Set(tables.map((t) => t.name));
      const hasDictionaryCore =
        tableNames.has("dictionary_entries") &&
        tableNames.has("dictionary_zh_entries") &&
        tableNames.has("dictionary_examples");
      const hasRiskTables = ["users", "history", "conversation_messages", "conversations", "assessments"].some((name) =>
        tableNames.has(name)
      );

      if (!hasDictionaryCore || hasRiskTables) {
        try {
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        } catch {}
        return false;
      }
    } finally {
      candidateDb.close();
    }

    fs.renameSync(tempFile, dbPath);
    resetDictionaryDb();
    return true;
  } catch {
    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    } catch {}
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function buildDictionaryDiagnosticsMessage(params: {
  dbLabel: string;
  englishCount: number;
  chineseCount: number;
  exampleCount: number;
  phraseCount?: number;
}) {
  const { dbLabel, englishCount, chineseCount, exampleCount, phraseCount = 0 } = params;
  const sources = getBootstrapSources();
  const hasRemote = REMOTE_HYDRATION_ENABLED && Boolean(runtimeConfig.remoteDbUrl);

  const diagnostics = [
    `当前字典文件: ${dbLabel}`,
    `词条数量(英/中/例句/短语): ${englishCount}/${chineseCount}/${exampleCount}/${phraseCount}`,
    `本地源文件: ECDICT ${sources.ecdict ? "已找到" : "缺失"}, CC-CEDICT ${sources.cedict ? "已找到" : "缺失"}, 例句库 ${
      sources.examples ? "已找到" : "缺失"
    }`,
    `远程词库地址: ${hasRemote ? "已配置" : "未配置"}`,
    `已登记数据源: ${
      getDictionarySources(4)
        .map((source) => `${source.source_name}(${source.entry_count})`)
        .join(", ") || "无"
    }`,
  ];

  return `当前词典数据不完整。${diagnostics.join("；")}。`;
}

async function fetchChineseGloss(text: string) {
  if (!ONLINE_FALLBACK_ENABLED) return null;
  const q = text.trim();
  if (!q) return null;
  const cacheKey = q.toLowerCase();
  const fromCache = readCache(zhGlossCache, cacheKey);
  if (fromCache !== null) return fromCache;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=en|zh-CN`;
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      responseData?: { translatedText?: string };
      matches?: Array<{ translation?: string }>;
    };

    const direct = payload.responseData?.translatedText?.trim() || "";
    if (direct && containsChinese(direct)) {
      writeCache(zhGlossCache, cacheKey, direct, ZH_GLOSS_CACHE_TTL_MS);
      return direct;
    }

    const hit = payload.matches?.find((m) => m.translation && containsChinese(m.translation))?.translation?.trim() || "";
    const finalValue = hit || null;
    writeCache(zhGlossCache, cacheKey, finalValue, ZH_GLOSS_CACHE_TTL_MS);
    return finalValue;
  } catch {
    writeCache(zhGlossCache, cacheKey, null, 30_000);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOnlineEnglishFallback(query: string) {
  if (!ONLINE_FALLBACK_ENABLED) return null;
  if (!isEnglishLikeQuery(query)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query.trim().toLowerCase())}`;
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) return null;

    const payload = (await response.json()) as Array<{
      word?: string;
      phonetic?: string;
      phonetics?: Array<{ text?: string; audio?: string }>;
      meanings?: Array<{ partOfSpeech?: string; definitions?: Array<{ definition?: string; example?: string }> }>;
    }>;
    const first = payload?.[0];
    if (!first?.word) return null;

    const meaningRows = (first.meanings || []).flatMap((m) =>
      (m.definitions || []).map((d) => ({
        pos: m.partOfSpeech || null,
        definition: d.definition?.trim() || "",
        example: d.example?.trim() || "",
      }))
    );

    const meanings = meaningRows.map((r) => r.definition).filter(Boolean).slice(0, 8);
    const examples = meaningRows
      .filter((r) => r.example)
      .slice(0, 6)
      .map((r) => ({ english: r.example, chinese: null }));
    const phonetic = first.phonetic || first.phonetics?.find((p) => p.text)?.text || null;
    const audio = first.phonetics?.find((p) => p.audio)?.audio || null;

    const zhWord = await fetchChineseGloss(first.word);
    const zhDef = meanings[0] ? await fetchChineseGloss(meanings[0]) : null;
    const translation = [zhWord, zhDef].filter(Boolean).join("；") || null;
    const mergedMeanings = [...(translation ? [`中文: ${translation}`] : []), ...meanings].slice(0, 8);

    return {
      word: first.word,
      phonetic,
      definition: meanings[0] || null,
      translation,
      meanings: mergedMeanings,
      pos: meaningRows.find((r) => r.pos)?.pos || null,
      collins: 0,
      oxford: 0,
      tag: null,
      bnc: 0,
      frq: 0,
      exchange: null,
      detail: null,
      audio,
      source: "online-fallback",
      examples,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOnlineChineseFallback(query: string) {
  if (!ONLINE_FALLBACK_ENABLED) return null;
  if (!containsChinese(query)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(query.trim())}&langpair=zh-CN|en`;
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      responseData?: { translatedText?: string };
      matches?: Array<{ translation?: string }>;
    };

    const direct = payload.responseData?.translatedText?.trim() || "";
    const hit = payload.matches?.find((m) => m.translation?.trim())?.translation?.trim() || "";
    const english = direct || hit;
    if (!english) return null;

    return {
      word: english,
      phonetic: null,
      definition: null,
      translation: query,
      meanings: [english],
      pos: null,
      collins: 0,
      oxford: 0,
      tag: null,
      bnc: 0,
      frq: 0,
      exchange: null,
      detail: null,
      audio: null,
      source: "online-fallback",
      examples: [] as Array<{ english: string; chinese: string | null }>,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function fetchLocalChineseCandidates(query: string, entry: any) {
  const db = getDictionaryDb();
  const normalizedQuery = query.trim().toLowerCase();
  const coreWord = normalizedQuery.match(/[a-z]+(?:'[a-z]+)?/)?.[0] || "";
  const keywords = uniqueStrings(
    [coreWord, ...extractEnglishKeywords(typeof entry?.word === "string" ? entry.word : "")].filter(Boolean),
    2
  );
  if (keywords.length === 0) return [] as string[];

  const clauses = keywords.map(() => "english LIKE ? COLLATE NOCASE").join(" OR ");
  const params = keywords.map((kw) => `%${kw}%`);
  const rows = db
    .prepare(
      `SELECT simplified, english
       FROM dictionary_zh_entries
       WHERE ${clauses}
       ORDER BY id ASC
       LIMIT 80`
    )
    .all(...params) as Array<{ simplified: string; english: string }>;

  const strongMatches = rows.filter((row) =>
    keywords.some((kw) => row.english.toLowerCase().split(/[\/;,()[\]\s]+/).includes(kw))
  );
  return uniqueStrings(
    strongMatches
      .map((row) => row.simplified.trim())
      .filter((item) => item.length >= 2 && item.length <= 8),
    8
  );
}

async function enrichEnglishEntryToZh(entry: any) {
  if (!entry || typeof entry !== "object") return entry;
  const baseWord = typeof entry.word === "string" ? entry.word.trim() : "";
  const chineseFromTranslation = extractChineseMeaningsFromText(typeof entry.translation === "string" ? entry.translation : null);
  const chineseFromMeanings = toArray(entry.meanings)
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .flatMap((item) => extractChineseMeaningsFromText(item));
  const directChineseCandidates = uniqueStrings([...chineseFromTranslation, ...chineseFromMeanings], 8);

  // Prefer dictionary-native Chinese definitions first; do not override with fuzzy reverse matches.
  if (directChineseCandidates.length > 0) {
    return {
      ...entry,
      translation: directChineseCandidates.join("；"),
      meanings: directChineseCandidates,
    };
  }

  const localChineseCandidates = fetchLocalChineseCandidates(baseWord, entry);
  const chineseCandidates = uniqueStrings(localChineseCandidates, 8);

  if (chineseCandidates.length > 0) {
    return {
      ...entry,
      translation: chineseCandidates.join("；"),
      meanings: chineseCandidates,
    };
  }

  if (hasChineseContentInEntry(entry)) {
    const prioritized = prioritizeChineseMeanings(entry);
    const chineseOnly = prioritized.filter((item) => containsChinese(item));
    return {
      ...entry,
      meanings: chineseOnly.length > 0 ? chineseOnly : prioritized,
      translation:
        typeof entry.translation === "string" && containsChinese(entry.translation)
          ? entry.translation
          : chineseOnly.join("；") || entry.translation,
    };
  }

  const word = baseWord;
  const firstMeaning = pickFirstMeaning(entry);
  const zhWord = word ? await fetchChineseGloss(word) : null;
  const zhMeaning = firstMeaning ? await fetchChineseGloss(firstMeaning) : null;
  const zhTranslation = [zhWord, zhMeaning].filter(Boolean).join("；") || null;

  if (!zhTranslation) return entry;

  const oldMeanings = toArray(entry.meanings).filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  );
  return {
    ...entry,
    translation: zhTranslation,
    meanings: [zhTranslation, ...oldMeanings.slice(0, 3)],
  };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const direction = normalizeDirection(request.nextUrl.searchParams.get("direction"));

  if (!query) {
    return NextResponse.json({ error: "缺少查询内容。" }, { status: 400 });
  }

  if (query.length > 80) {
    return NextResponse.json({ error: "简易查词只支持单词、词组或较短句子。" }, { status: 400 });
  }

  const cacheKey = `${direction}:${query.toLowerCase()}`;
  const cachedPayload = readLookupPayloadCache(cacheKey);
  if (cachedPayload) {
    return NextResponse.json(cachedPayload);
  }

  try {
    const dbPath = getDictionaryDbPath();
    const dbLabel = path.basename(dbPath);
    const now = Date.now();

    const refreshCounts = async () => {
      let nextCounts = getDictionaryCounts({ force: true });
      if (RUNTIME_BOOTSTRAP_ENABLED && !isDictionaryRichEnough(nextCounts)) {
        tryBootstrapDictionary();
        nextCounts = getDictionaryCounts({ force: true });
      }
      if (RUNTIME_BOOTSTRAP_ENABLED && !isDictionaryRichEnough(nextCounts)) {
        const hydrated = await tryHydrateDictionaryFromRemote(dbPath);
        if (hydrated) {
          nextCounts = getDictionaryCounts({ force: true });
        }
      }
      cachedCounts = nextCounts;
      lastCountsCheckAt = Date.now();
      return nextCounts;
    };

    let counts: DictionaryCounts;
    if (cachedCounts && now - lastCountsCheckAt < CHECK_TTL_MS) {
      counts = cachedCounts;
    } else {
      if (!checkInFlight) {
        checkInFlight = refreshCounts().finally(() => {
          checkInFlight = null;
        });
      }
      counts = await checkInFlight;
    }

    const queryLocalReady = isDictionaryUsableForQuery(query, counts);
    if (!queryLocalReady) {
      const fallback = containsChinese(query)
        ? await fetchOnlineChineseFallback(query)
        : await fetchOnlineEnglishFallback(query);

      if (fallback) {
        const payload = {
          entry: fallback,
          direction,
          warning: buildDictionaryDiagnosticsMessage({
            dbLabel,
            englishCount: counts.englishCount,
            chineseCount: counts.chineseCount,
            exampleCount: counts.exampleCount,
            phraseCount: counts.phraseCount,
          }),
        };
        writeLookupPayloadCache(cacheKey, payload);
        return NextResponse.json(payload);
      }

      return NextResponse.json(
        {
          error: buildDictionaryDiagnosticsMessage({
            dbLabel,
            englishCount: counts.englishCount,
            chineseCount: counts.chineseCount,
            exampleCount: counts.exampleCount,
            phraseCount: counts.phraseCount,
          }),
        },
        { status: 503 }
      );
    }

    getDictionaryDb();
    let entry = getDictionaryEntry(query, { direction });
    // Legacy enrichment is now fallback-only to avoid overriding new layered dictionary results.
    if (entry && isEnglishLikeQuery(query) && !hasChineseContentInEntry(entry)) {
      entry = await enrichEnglishEntryToZh(entry);
    }

    let phraseResolvedBy: string | null = null;
    if (!entry && isEnglishLikeQuery(query) && query.trim().includes(" ")) {
      const rewrites = buildEnglishRewriteCandidates(query);
      for (const candidate of rewrites) {
        if (!candidate || candidate === query.trim().toLowerCase()) continue;
        const candidateEntry = getDictionaryEntry(candidate, { direction });
        if (!candidateEntry) continue;
        entry = candidateEntry;
        phraseResolvedBy = candidate;
        break;
      }
      if (entry && !hasChineseContentInEntry(entry)) {
        entry = await enrichEnglishEntryToZh(entry);
      }
    }

    if (!entry && containsChinese(query)) {
      const zhRewrites = buildChineseRewriteCandidates(query);
      for (const candidate of zhRewrites) {
        if (!candidate || candidate === query.trim()) continue;
        const candidateEntry = getDictionaryEntry(candidate, { direction });
        if (!candidateEntry) continue;
        entry = candidateEntry;
        phraseResolvedBy = candidate;
        break;
      }
    }

    if (!entry) {
      if (isLikelyPartialEnglishQuery(query)) {
        const related = searchDictionaryEntries(query, 8);
        return NextResponse.json({
          entry: null,
          direction,
          suggestions: related,
          hint: `“${query}”更像输入中的前缀，建议继续输入完整词，或直接点联想词条。`,
        });
      }

      const fallback = containsChinese(query)
        ? await fetchOnlineChineseFallback(query)
        : await fetchOnlineEnglishFallback(query);
      if (fallback) {
        const payload = { entry: fallback, direction };
        writeLookupPayloadCache(cacheKey, payload);
        return NextResponse.json(payload);
      }
      // Typing stage should not be treated as an error.
      const related = isEnglishLikeQuery(query) ? searchDictionaryEntries(query, 8) : [];
      return NextResponse.json({
        entry: null,
        direction,
        suggestions: related,
        hint: `未找到“${query}”的完整词条。你可以继续输入，或尝试核心词（如去掉 to / 冠词）后再查。`,
      });
    }

    const payload = {
      entry,
      direction,
      hint: phraseResolvedBy ? `已将“${query}”按短语规则解析为“${phraseResolvedBy}”并展示基础词义。` : undefined,
    };
    writeLookupPayloadCache(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (error) {
    const fallback = containsChinese(query) ? await fetchOnlineChineseFallback(query) : await fetchOnlineEnglishFallback(query);
    if (fallback) {
      const payload = {
        entry: fallback,
        direction,
        warning: "本地词库暂不可用，已切换在线词典。",
      };
      writeLookupPayloadCache(cacheKey, payload);
      return NextResponse.json(payload);
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "词典服务暂不可用，请稍后重试。",
      },
      { status: 503 }
    );
  }
}
