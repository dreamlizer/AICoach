import { getDictionaryDb } from "./server/db/dictionary-core";

export type DictionaryDirection = "auto" | "en2zh" | "zh2en";

export type DictionaryEntry = {
  word: string;
  phonetic: string | null;
  definition: string | null;
  translation: string | null;
  pos: string | null;
  collins: number;
  oxford: number;
  tag: string | null;
  bnc: number;
  frq: number;
  exchange: string | null;
  detail: string | null;
  audio: string | null;
  source: string;
};

export type DictionaryDefinitionLayer = {
  text: string;
  lang: "zh" | "en";
  role: "core" | "extended";
  source: string;
  quality: number;
  pos: string | null;
};

export type DictionaryExample = {
  english: string;
  chinese: string | null;
  source?: string;
  quality?: number;
};

export type DictionarySuggestion = {
  word: string;
  phonetic: string | null;
  translation: string | null;
  pos: string | null;
};

type ChineseDictionaryRow = {
  simplified: string;
  traditional: string;
  pinyin: string | null;
  english: string;
};

type DictionaryPhraseRow = {
  phrase: string;
  normalized_phrase: string;
  translation: string | null;
  definition: string | null;
  meanings_json: string | null;
  pos: string | null;
  direction: string;
  source: string;
  quality: number;
};

type ExampleLookupOptions = {
  query?: string;
  englishWords?: string[];
  limit?: number;
};

type DictionaryLookupOptions = {
  direction?: DictionaryDirection;
};

function isChineseQuery(query: string) {
  return /[\u3400-\u9fff]/.test(query);
}

function normalizePhraseKey(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/^[\s"'`“”‘’.,!?;:()\-_/\\]+/, "")
    .replace(/[\s"'`“”‘’.,!?;:()\-_/\\]+$/, "")
    .replace(/\s+/g, " ");
}

function isLikelyEnglishPhrase(text: string) {
  const normalized = normalizePhraseKey(text);
  return normalized.includes(" ") && /^[a-z][a-z0-9' -]{1,79}$/i.test(normalized);
}

function containsChinese(text: string) {
  return /[\u3400-\u9fff]/.test(text);
}

function normalizeMeaning(value: string) {
  return value.replace(/^\[[^\]]+\]\s*/, "").replace(/\s+/g, " ").trim();
}

function looksLikeMojibake(text: string) {
  return /[\u00c0-\u00ff]{3,}/.test(text) || /脙.|脗.|脨.|脩.|脴.|脵./.test(text);
}

function repairMojibake(text: string) {
  if (!text || !looksLikeMojibake(text)) return text;
  try {
    const repaired = Buffer.from(text, "latin1").toString("utf8");
    const beforeChinese = containsChinese(text);
    const afterChinese = containsChinese(repaired);
    if (!beforeChinese && afterChinese) return repaired;
    if (afterChinese && repaired.length >= Math.max(2, Math.floor(text.length * 0.6))) return repaired;
  } catch {}
  return text;
}

function normalizeDictionaryText(text: string | null | undefined) {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  return repairMojibake(trimmed);
}

function uniqueStrings(values: string[], limit = values.length) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    const key = normalized.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (result.length >= limit) break;
  }
  return result;
}

function splitChineseGlosses(gloss: string) {
  const normalizedGloss = normalizeDictionaryText(gloss) || gloss;
  return normalizedGloss
    .replace(/^\//, "")
    .replace(/\/$/, "")
    .split(/[\/;；|]+/)
    .map((item) => normalizeMeaning(item))
    .filter(Boolean);
}

function splitEnglishDefinition(definition: string | null) {
  if (!definition) return [] as string[];
  return definition
    .split(/[.;,:\n/|]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 4)
    .slice(0, 8);
}

export function splitDictionaryMeanings(translation: string | null) {
  if (!translation) return [] as string[];
  return translation
    .replace(/\\n/g, "\n")
    .split(/\n+/)
    .flatMap((line) => line.split(/[\/|;,，。；]+/))
    .map((item) => normalizeMeaning(item))
    .filter(Boolean)
    .slice(0, 12);
}

export function inferPartOfSpeech(entry: Pick<DictionaryEntry, "pos" | "translation" | "definition">) {
  if (entry.pos?.trim()) return entry.pos.trim();
  const source = `${entry.translation || ""}\n${entry.definition || ""}`;
  const match = source.match(/\b(n|v|vt|vi|adj|adv|a|prep|conj|pron|num|int|aux)\./i);
  return match ? match[1].toLowerCase() : null;
}

function inferPartOfSpeechFromMeaningText(text: string) {
  if (!text) return null;
  const normalized = text.trim().toLowerCase();
  if (!normalized) return null;
  const leading = normalized.match(
    /^((?:(?:n|v|vt|vi|adj|adv|a|prep|conj|pron|num|int|aux|modal|phr|phrase|abbr)\.?\s*(?:\/|,|&|\||and)?\s*)+)/
  );
  if (leading?.[1]) {
    const code = leading[1].match(/\b(n|v|vt|vi|adj|adv|a|prep|conj|pron|num|int|aux|modal|phr|phrase|abbr)\b/i)?.[1] || null;
    return code ? code.toLowerCase() : null;
  }
  const trailing = normalized.match(/\b(n|v|vt|vi|adj|adv|a|prep|conj|pron|num|int|aux|modal|phr|phrase|abbr)\.?$/i);
  return trailing?.[1] ? trailing[1].toLowerCase() : null;
}

function generateEnglishLemmas(word: string) {
  const w = word.trim().toLowerCase();
  if (!w || !/^[a-z][a-z'-]{2,}$/.test(w)) return [] as string[];
  const candidates = new Set<string>([w]);
  if (w.endsWith("ies") && w.length > 4) candidates.add(`${w.slice(0, -3)}y`);
  if (w.endsWith("es") && w.length > 3) candidates.add(w.slice(0, -2));
  if (w.endsWith("s") && w.length > 3) candidates.add(w.slice(0, -1));
  if (w.endsWith("ing") && w.length > 5) {
    candidates.add(w.slice(0, -3));
    candidates.add(`${w.slice(0, -3)}e`);
  }
  if (w.endsWith("ed") && w.length > 4) {
    candidates.add(w.slice(0, -2));
    candidates.add(`${w.slice(0, -1)}`);
  }
  return Array.from(candidates);
}

function getEnglishEntry(word: string) {
  const db = getDictionaryDb();
  const row = db
    .prepare(
      `SELECT word, phonetic, definition, translation, pos, collins, oxford, tag, bnc, frq, exchange, detail, audio, source
       FROM dictionary_entries
       WHERE word = ? COLLATE NOCASE
       LIMIT 1`
    )
    .get(word.trim()) as DictionaryEntry | undefined;

  if (!row) return undefined;
  return {
    ...row,
    word: normalizeDictionaryText(row.word) || row.word,
    phonetic: normalizeDictionaryText(row.phonetic),
    definition: normalizeDictionaryText(row.definition),
    translation: normalizeDictionaryText(row.translation),
    pos: normalizeDictionaryText(row.pos),
    tag: normalizeDictionaryText(row.tag),
    bnc: Number(row.bnc || 0),
    frq: Number(row.frq || 0),
    exchange: normalizeDictionaryText(row.exchange),
    detail: normalizeDictionaryText(row.detail),
    audio: normalizeDictionaryText(row.audio),
    source: normalizeDictionaryText(row.source) || row.source,
  };
}

function getEnglishEntryWithLemma(query: string) {
  const lemmas = generateEnglishLemmas(query);
  for (const lemma of lemmas) {
    const entry = getEnglishEntry(lemma);
    if (entry) return { entry, matchedLemma: lemma };
  }
  return { entry: null, matchedLemma: null as string | null };
}

function annotateExamples(rows: DictionaryExample[], source: string, quality: number) {
  return rows.map((row) => ({
    english: normalizeDictionaryText(row.english) || row.english,
    chinese: normalizeDictionaryText(row.chinese),
    source,
    quality,
  }));
}

function buildFallbackExamplesFromRelatedEntries(word: string, limit = 6) {
  const db = getDictionaryDb();
  const normalized = word.trim().toLowerCase();
  if (!normalized) return [] as DictionaryExample[];

  const rows = db
    .prepare(
      `SELECT word, translation
       FROM dictionary_entries
       WHERE (word LIKE ? COLLATE NOCASE OR word LIKE ? COLLATE NOCASE OR word LIKE ? COLLATE NOCASE)
         AND translation IS NOT NULL
         AND trim(translation) <> ''
       ORDER BY frq DESC, LENGTH(word) ASC
       LIMIT ?`
    )
    .all(`${normalized} %`, `% ${normalized}`, `% ${normalized} %`, Math.max(limit * 3, 12)) as Array<{
    word: string;
    translation: string | null;
  }>;

  return uniqueStrings(rows.map((row) => `${row.word}\t${row.translation || ""}`), limit).map((line) => {
    const [english, chinese] = line.split("\t");
    return { english, chinese: chinese || null };
  });
}

function buildFallbackExamplesFromDefinition(entry: DictionaryEntry, limit = 6) {
  const text = `${entry.definition || ""} ${entry.translation || ""}`.trim();
  if (!text) return [] as DictionaryExample[];
  const fragments = text
    .split(/[.;,:\n/|]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 8 && part.length <= 140)
    .slice(0, limit);
  return fragments.map((fragment) => ({
    english: `${entry.word}: ${fragment}`,
    chinese: null,
  }));
}

function buildFallbackExamples(word: string, limit = 6) {
  const byRelated = buildFallbackExamplesFromRelatedEntries(word, limit);
  if (byRelated.length >= limit) return annotateExamples(byRelated.slice(0, limit), "fallback-related", 0.45);

  const entry = getEnglishEntry(word);
  if (!entry) return annotateExamples(byRelated, "fallback-related", 0.45);

  const byDefinition = buildFallbackExamplesFromDefinition(entry, limit);
  const merged = uniqueStrings(
    [...byRelated, ...byDefinition].map((item) => `${item.english}\t${item.chinese || ""}`),
    limit
  ).map((line) => {
    const [english, chinese] = line.split("\t");
    return { english, chinese: chinese || null };
  });
  return annotateExamples(merged, "fallback-definition", 0.4);
}

function getExamplesForWord(word: string) {
  const db = getDictionaryDb();
  const direct = db
    .prepare(
      `SELECT english, chinese
       FROM dictionary_examples
       WHERE word = ? COLLATE NOCASE
       ORDER BY LENGTH(english) ASC, id ASC
       LIMIT 6`
    )
    .all(word) as DictionaryExample[];

  if (direct.length > 0) return annotateExamples(direct, "dictionary_examples", 0.92);
  return buildFallbackExamples(word, 6);
}

function getExamplesForLookup({ query, englishWords = [], limit = 6 }: ExampleLookupOptions) {
  const db = getDictionaryDb();
  const examples: DictionaryExample[] = [];
  const seen = new Set<string>();

  const pushExamples = (rows: DictionaryExample[]) => {
    for (const row of rows) {
      const normalizedRow: DictionaryExample = {
        english: normalizeDictionaryText(row.english) || row.english,
        chinese: normalizeDictionaryText(row.chinese),
        source: row.source,
        quality: row.quality,
      };
      const key = `${normalizedRow.english}__${normalizedRow.chinese || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      examples.push(normalizedRow);
      if (examples.length >= limit) break;
    }
  };

  if (query && isChineseQuery(query)) {
    const chineseRows = db
      .prepare(
        `SELECT english, chinese
         FROM dictionary_examples
         WHERE chinese LIKE ?
         ORDER BY CASE
           WHEN chinese = ? THEN 0
           WHEN chinese LIKE ? THEN 1
           ELSE 2
         END, LENGTH(chinese) ASC, id ASC
         LIMIT ?`
      )
      .all(`%${query}%`, query, `${query}%`, limit * 2) as DictionaryExample[];
    pushExamples(annotateExamples(chineseRows, "dictionary_examples", 0.9));
  }

  if (examples.length < limit && englishWords.length > 0) {
    const normalizedWords = uniqueStrings(englishWords.map((item) => item.toLowerCase()), 10);
    const stmt = db.prepare(
      `SELECT english, chinese
       FROM dictionary_examples
       WHERE word = ? COLLATE NOCASE
       ORDER BY LENGTH(english) ASC, id ASC
       LIMIT ?`
    );

    for (const word of normalizedWords) {
      pushExamples(annotateExamples(stmt.all(word, limit) as DictionaryExample[], "dictionary_examples", 0.92));
      if (examples.length >= limit) break;
    }

    if (examples.length < limit) {
      for (const word of normalizedWords) {
        pushExamples(buildFallbackExamples(word, limit));
        if (examples.length >= limit) break;
      }
    }
  }

  return examples.slice(0, limit);
}

function getChineseRows(query: string, limit = 8) {
  const db = getDictionaryDb();
  const rows = db
    .prepare(
      `SELECT simplified, traditional, pinyin, english
       FROM dictionary_zh_entries
       WHERE simplified = ? OR traditional = ? OR simplified LIKE ? OR traditional LIKE ?
       ORDER BY CASE
         WHEN simplified = ? THEN 0
         WHEN traditional = ? THEN 1
         WHEN simplified LIKE ? THEN 2
         WHEN traditional LIKE ? THEN 3
         ELSE 4
       END, LENGTH(simplified) ASC, id ASC
       LIMIT ?`
    )
    .all(query, query, `${query}%`, `${query}%`, query, query, `${query}%`, `${query}%`, limit) as ChineseDictionaryRow[];

  if (rows.length >= limit) return rows;

  const fallbackRows = db
    .prepare(
      `SELECT simplified, traditional, pinyin, english
       FROM dictionary_zh_entries
       WHERE (simplified LIKE ? OR traditional LIKE ?)
         AND simplified <> ?
         AND traditional <> ?
       ORDER BY LENGTH(simplified) ASC, id ASC
       LIMIT ?`
    )
    .all(`%${query}%`, `%${query}%`, query, query, limit * 2) as ChineseDictionaryRow[];

  const seen = new Set<string>();
  const merged: ChineseDictionaryRow[] = [];
  for (const row of [...rows, ...fallbackRows]) {
    const key = `${row.simplified}__${row.traditional}__${row.english}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
    if (merged.length >= limit) break;
  }
  return merged;
}

function getPhraseRows(query: string, limit = 8) {
  const normalized = normalizePhraseKey(query);
  if (!normalized) return [] as DictionaryPhraseRow[];
  const db = getDictionaryDb();
  const rows = db
    .prepare(
      `SELECT phrase, normalized_phrase, translation, definition, meanings_json, pos, direction, source, quality
       FROM dictionary_phrase_entries
       WHERE normalized_phrase = ?
          OR normalized_phrase LIKE ?
       ORDER BY CASE
         WHEN normalized_phrase = ? THEN 0
         WHEN normalized_phrase LIKE ? THEN 1
         ELSE 2
       END, quality DESC, LENGTH(phrase) ASC
       LIMIT ?`
    )
    .all(normalized, `${normalized}%`, normalized, `${normalized}%`, Math.max(limit, 4)) as DictionaryPhraseRow[];
  return rows;
}

function parseMeaningsJson(value: string | null) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed
      .map((item) => normalizeDictionaryText(String(item || "")) || "")
      .filter(Boolean);
  } catch {
    return [] as string[];
  }
}

type ChineseSense = {
  text: string;
  pos: string | null;
  quality: number;
};

function inferPosFromChineseGloss(gloss: string) {
  const g = gloss.toLowerCase().trim();
  if (!g) return null;
  if (g.startsWith("to ")) return "v";
  if (/^(a|an|the)\s+[a-z]/.test(g)) return "n";
  if (g.includes("ly")) return "adv";
  return null;
}

function normalizeChineseGlossToCandidate(gloss: string) {
  return gloss
    .replace(/^\([^)]*\)\s*/, "")
    .replace(/^to\s+/i, "")
    .replace(/^(a|an|the)\s+/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isCleanEnglishCandidate(candidate: string) {
  return /^[a-z][a-z0-9' -]{0,47}$/i.test(candidate);
}

function collectChineseSenses(rows: ChineseDictionaryRow[]) {
  const seen = new Set<string>();
  const result: ChineseSense[] = [];

  for (const row of rows) {
    const glosses = splitChineseGlosses(row.english);
    for (const gloss of glosses) {
      const normalizedGloss = normalizeDictionaryText(gloss) || gloss;
      const candidate = normalizeChineseGlossToCandidate(normalizedGloss);
      if (!candidate || !isCleanEnglishCandidate(candidate)) continue;
      const pos = inferPosFromChineseGloss(normalizedGloss);
      const key = `${candidate.toLowerCase()}__${pos || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        text: candidate,
        pos,
        quality: candidate.includes(" ") ? 0.8 : 0.92,
      });
      if (result.length >= 16) break;
    }
    if (result.length >= 16) break;
  }

  return result;
}

function pickEnglishCandidate(glosses: string[]) {
  const normalized = glosses
    .map((item) => normalizeChineseGlossToCandidate(item))
    .filter((item) => isCleanEnglishCandidate(item));
  const singleWord = normalized.find((item) => /^[a-z][a-z0-9'-]{1,31}$/i.test(item));
  return singleWord || normalized[0] || null;
}

function collectEnglishCandidates(rows: ChineseDictionaryRow[]) {
  const senses = collectChineseSenses(rows);
  return uniqueStrings(senses.map((item) => item.text), 16);
}

function pickPrimaryChineseRow(rows: ChineseDictionaryRow[], query: string) {
  return (
    rows.find((row) => row.simplified === query || row.traditional === query) ||
    rows.find((row) => row.simplified.startsWith(query) || row.traditional.startsWith(query)) ||
    rows[0]
  );
}

function prioritizeLayers(layers: DictionaryDefinitionLayer[], direction: DictionaryDirection) {
  const ordered = [...layers].sort((a, b) => b.quality - a.quality);
  if (direction === "zh2en") {
    return [...ordered.filter((item) => item.lang === "en"), ...ordered.filter((item) => item.lang === "zh")];
  }
  return [...ordered.filter((item) => item.lang === "zh"), ...ordered.filter((item) => item.lang === "en")];
}

function buildEnglishDefinitionLayers(entry: DictionaryEntry, direction: DictionaryDirection) {
  const pos = inferPartOfSpeech(entry);
  const zh = splitDictionaryMeanings(entry.translation).filter((item) => containsChinese(item));
  const en = splitEnglishDefinition(entry.definition).filter((item) => !containsChinese(item));

  const layers: DictionaryDefinitionLayer[] = [
    ...zh.map((text) => ({
      text,
      lang: "zh" as const,
      role: "core" as const,
      source: entry.source || "ecdict",
      quality: 0.92,
      pos: inferPartOfSpeechFromMeaningText(text) || pos,
    })),
    ...en.map((text, index) => ({
      text,
      lang: "en" as const,
      role: index < 3 ? ("core" as const) : ("extended" as const),
      source: entry.source || "ecdict",
      quality: index < 3 ? 0.78 : 0.62,
      pos: null,
    })),
  ];

  return prioritizeLayers(layers, direction);
}

function buildChineseLookupEntry(rows: ChineseDictionaryRow[], query: string, direction: DictionaryDirection) {
  const normalizedRows = rows.map((row) => ({
    simplified: normalizeDictionaryText(row.simplified) || row.simplified,
    traditional: normalizeDictionaryText(row.traditional) || row.traditional,
    pinyin: normalizeDictionaryText(row.pinyin),
    english: normalizeDictionaryText(row.english) || row.english,
  }));
  const primaryRow = pickPrimaryChineseRow(normalizedRows, query);
  if (!primaryRow) return null;

  const exactRows = normalizedRows.filter((row) => row.simplified === query || row.traditional === query);
  const rowsForSenses = exactRows.length > 0 ? exactRows : normalizedRows;
  const senses = collectChineseSenses(rowsForSenses);
  const englishCandidates = uniqueStrings(senses.map((item) => item.text), 16);
  const englishEntry = englishCandidates.map((item) => getEnglishEntry(item)).find(Boolean) || null;
  const examples = getExamplesForLookup({ query, englishWords: englishCandidates, limit: 6 });
  const layers = prioritizeLayers(
    senses.map((sense, index) => ({
      text: sense.text,
      lang: "en" as const,
      role: index < 4 ? ("core" as const) : ("extended" as const),
      source: "cc-cedict",
      quality: sense.quality - (index >= 4 ? 0.12 : 0),
      pos: sense.pos,
    })),
    direction
  );
  const primaryPos = layers.find((item) => item.pos)?.pos || null;
  const fallbackWord = englishCandidates[0] || query;

  if (englishEntry) {
    return {
      ...englishEntry,
      phonetic: englishEntry.phonetic || primaryRow.pinyin || null,
      translation: primaryRow.simplified,
      pos: primaryPos || inferPartOfSpeech(englishEntry),
      source: "cc-cedict",
      definitionLayers: layers,
      meanings: layers.map((item) => item.text).slice(0, 10),
      examples: examples.length > 0 ? examples : getExamplesForWord(englishEntry.word),
    };
  }

  return {
    word: fallbackWord,
    phonetic: primaryRow.pinyin || null,
    definition: null,
    translation: primaryRow.simplified,
    pos: primaryPos,
    collins: 0,
    oxford: 0,
    tag: null,
    bnc: 0,
    frq: 0,
    exchange: null,
    detail: null,
    audio: null,
    source: "cc-cedict",
    definitionLayers: layers,
    meanings: layers.map((item) => item.text).slice(0, 10),
    examples,
  };
}

function buildPhraseLookupEntry(query: string, direction: DictionaryDirection) {
  const phraseRows = getPhraseRows(query, 6);
  if (phraseRows.length === 0) return null;
  const best = phraseRows[0];
  const phrase = normalizeDictionaryText(best.phrase) || best.phrase;

  const meanings = uniqueStrings(
    phraseRows.flatMap((row) => {
      const fromJson = parseMeaningsJson(row.meanings_json);
      const fromDefinition = splitDictionaryMeanings(row.definition || null);
      const fromTranslation = splitDictionaryMeanings(row.translation || null);
      return [...fromJson, ...fromDefinition, ...fromTranslation];
    }),
    12
  );

  const layers = prioritizeLayers(
    meanings.map((text, index) => ({
      text,
      lang: containsChinese(text) ? ("zh" as const) : ("en" as const),
      role: index < 6 ? ("core" as const) : ("extended" as const),
      source: best.source || "phrase-dataset",
      quality: Number(best.quality || 0.8) - (index >= 6 ? 0.1 : 0),
      pos: normalizeDictionaryText(best.pos),
    })),
    direction
  );

  const phraseTokens = uniqueStrings(
    (phrase.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []).filter((item) => item.length >= 2),
    10
  );

  const examples = getExamplesForLookup({ query: phrase, englishWords: [phrase, ...phraseTokens], limit: 6 });

  return {
    word: phrase,
    phonetic: null,
    definition: normalizeDictionaryText(best.definition),
    translation: normalizeDictionaryText(best.translation),
    pos: normalizeDictionaryText(best.pos),
    collins: 0,
    oxford: 0,
    tag: "phrase",
    bnc: 0,
    frq: 0,
    exchange: null,
    detail: null,
    audio: null,
    source: normalizeDictionaryText(best.source) || "phrase-dataset",
    definitionLayers: layers,
    meanings: layers.map((item) => item.text).slice(0, 12),
    examples,
    queryMeta: {
      matchedWord: phrase,
      matchedByLemma: false,
      requestedQuery: query.trim(),
      direction,
      matchedByPhrase: true,
    },
  };
}

export function getDictionaryEntry(query: string, options?: DictionaryLookupOptions) {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const direction = options?.direction || "auto";

  if (isChineseQuery(trimmed)) {
    const rows = getChineseRows(trimmed, 10);
    if (rows.length === 0) return null;
    return buildChineseLookupEntry(rows, trimmed, direction);
  }

  if (isLikelyEnglishPhrase(trimmed)) {
    const phraseEntry = buildPhraseLookupEntry(trimmed, direction);
    if (phraseEntry) return phraseEntry;
  }

  const lookup = getEnglishEntryWithLemma(trimmed);
  const entry = lookup.entry;
  if (!entry) return null;

  const layers = buildEnglishDefinitionLayers(entry, direction);
  return {
    ...entry,
    pos: inferPartOfSpeech(entry),
    definitionLayers: layers,
    meanings: layers.map((item) => item.text).slice(0, 10),
    examples: getExamplesForWord(entry.word),
    queryMeta: {
      matchedWord: entry.word,
      matchedByLemma: lookup.matchedLemma ? lookup.matchedLemma !== trimmed.toLowerCase() : false,
      requestedQuery: trimmed,
      direction,
    },
  };
}

export function searchDictionaryEntries(query: string, limit = 8) {
  const trimmed = query.trim();
  const normalized = trimmed.toLowerCase();
  if (!normalized) return [] as DictionarySuggestion[];

  const db = getDictionaryDb();

  if (isChineseQuery(trimmed)) {
    const rows = getChineseRows(trimmed, Math.max(limit * 2, 12));
    return rows
      .map((row) => {
        const glosses = splitChineseGlosses(row.english);
        return {
          word: normalizeDictionaryText(pickEnglishCandidate(glosses) || glosses[0] || row.simplified) || row.simplified,
          phonetic: normalizeDictionaryText(row.pinyin),
          translation: uniqueStrings(glosses, 3).join(" / "),
          pos: null,
        };
      })
      .filter((item) => item.word)
      .slice(0, limit) as DictionarySuggestion[];
  }

  const phraseRows =
    normalized.includes(" ") || normalized.length >= 4
      ? getPhraseRows(trimmed, Math.max(limit, 6)).map((row) => ({
          word: normalizeDictionaryText(row.phrase) || row.phrase,
          phonetic: null,
          translation: normalizeDictionaryText(row.translation) || normalizeDictionaryText(row.definition),
          pos: normalizeDictionaryText(row.pos),
        }))
      : [];

  const rows = db
    .prepare(
      `SELECT word, phonetic, translation, pos
       FROM dictionary_entries
       WHERE word LIKE ? COLLATE NOCASE
       ORDER BY CASE WHEN word = ? COLLATE NOCASE THEN 0 ELSE 1 END, frq DESC, word ASC
       LIMIT ?`
    )
    .all(`${normalized}%`, normalized, limit) as DictionarySuggestion[];

  const words = rows.map((row) => ({
    word: normalizeDictionaryText(row.word) || row.word,
    phonetic: normalizeDictionaryText(row.phonetic),
    translation: normalizeDictionaryText(row.translation),
    pos: normalizeDictionaryText(row.pos),
  }));

  return uniqueStrings(
    [...phraseRows, ...words].map((row) => JSON.stringify(row)),
    limit
  ).map((row) => JSON.parse(row) as DictionarySuggestion);
}


