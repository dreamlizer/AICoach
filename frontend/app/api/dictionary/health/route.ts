import { NextRequest, NextResponse } from "next/server";
import { getDictionaryEntry, searchDictionaryEntries } from "@/lib/dictionary";
import { getDictionaryCounts, getDictionaryDbPath, getDictionarySources } from "@/lib/server/db/dictionary-core";
import { getDictionaryRuntimeConfig } from "@/lib/server/dictionary/runtime-config";

const MIN_COUNTS = {
  english: 100000,
  chinese: 20000,
  examples: 5000,
};

const SAMPLE_QUERIES = {
  lookupEnglish: ["promise", "utility", "commit"],
  lookupChinese: ["承诺", "工具", "人民"],
  suggestEnglish: ["pro", "uti", "com"],
  suggestChinese: ["承", "人"],
};

function nowMs() {
  return Date.now();
}

function measure<T>(fn: () => T) {
  const started = nowMs();
  const value = fn();
  return { value, elapsedMs: nowMs() - started };
}

export async function GET(request: NextRequest) {
  try {
    const strict = request.nextUrl.searchParams.get("strict") === "1";
    const counts = getDictionaryCounts();
    const sources = getDictionarySources();
    const dbPath = getDictionaryDbPath();
    const runtimeConfig = getDictionaryRuntimeConfig();

    const issues: string[] = [];
    if (counts.englishCount < MIN_COUNTS.english) {
      issues.push(`englishCount 过低: ${counts.englishCount} < ${MIN_COUNTS.english}`);
    }
    if (counts.chineseCount < MIN_COUNTS.chinese) {
      issues.push(`chineseCount 过低: ${counts.chineseCount} < ${MIN_COUNTS.chinese}`);
    }
    if (counts.exampleCount < MIN_COUNTS.examples) {
      issues.push(`exampleCount 过低: ${counts.exampleCount} < ${MIN_COUNTS.examples}`);
    }

    const englishLookupResults = SAMPLE_QUERIES.lookupEnglish.map((query) => {
      const { value, elapsedMs } = measure(() => getDictionaryEntry(query));
      return { query, hit: Boolean(value), elapsedMs };
    });
    const chineseLookupResults = SAMPLE_QUERIES.lookupChinese.map((query) => {
      const { value, elapsedMs } = measure(() => getDictionaryEntry(query));
      return { query, hit: Boolean(value), elapsedMs };
    });
    const englishSuggestResults = SAMPLE_QUERIES.suggestEnglish.map((query) => {
      const { value, elapsedMs } = measure(() => searchDictionaryEntries(query, 8));
      return { query, count: value.length, elapsedMs };
    });
    const chineseSuggestResults = SAMPLE_QUERIES.suggestChinese.map((query) => {
      const { value, elapsedMs } = measure(() => searchDictionaryEntries(query, 8));
      return { query, count: value.length, elapsedMs };
    });

    const missingLookups = [...englishLookupResults, ...chineseLookupResults].filter((item) => !item.hit);
    if (missingLookups.length > 0) {
      issues.push(`抽样词条未命中: ${missingLookups.map((item) => item.query).join(", ")}`);
    }

    const emptySuggests = [...englishSuggestResults, ...chineseSuggestResults].filter((item) => item.count <= 0);
    if (emptySuggests.length > 0) {
      issues.push(`抽样联想为空: ${emptySuggests.map((item) => item.query).join(", ")}`);
    }

    const lookupLatency = [...englishLookupResults, ...chineseLookupResults].map((item) => item.elapsedMs);
    const suggestLatency = [...englishSuggestResults, ...chineseSuggestResults].map((item) => item.elapsedMs);
    const maxLookupMs = lookupLatency.length > 0 ? Math.max(...lookupLatency) : 0;
    const maxSuggestMs = suggestLatency.length > 0 ? Math.max(...suggestLatency) : 0;

    if (maxLookupMs > 1500) {
      issues.push(`抽样详情查询过慢: ${maxLookupMs}ms > 1500ms`);
    }
    if (maxSuggestMs > 800) {
      issues.push(`抽样联想查询过慢: ${maxSuggestMs}ms > 800ms`);
    }

    const ready = issues.length === 0;
    const payload = {
      ok: true,
      ready,
      dbPath,
      profile: runtimeConfig.profile,
      runtime: {
        defaultDbFile: runtimeConfig.defaultDbFile,
        onlineFallbackEnabled: runtimeConfig.onlineFallbackEnabled,
        runtimeBootstrapEnabled: runtimeConfig.runtimeBootstrapEnabled,
        remoteHydrationEnabled: runtimeConfig.remoteHydrationEnabled,
        remoteDbUrlConfigured: Boolean(runtimeConfig.remoteDbUrl),
      },
      counts,
      sources,
      thresholds: MIN_COUNTS,
      probes: {
        lookupEnglish: englishLookupResults,
        lookupChinese: chineseLookupResults,
        suggestEnglish: englishSuggestResults,
        suggestChinese: chineseSuggestResults,
        maxLookupMs,
        maxSuggestMs,
      },
      issues,
      strict,
      generatedAt: new Date().toISOString(),
    };

    if (strict && !ready) {
      return NextResponse.json(payload, { status: 503 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "dictionary health check failed",
      },
      { status: 500 }
    );
  }
}

