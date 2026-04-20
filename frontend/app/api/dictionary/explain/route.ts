import { NextRequest, NextResponse } from "next/server";
import { type DictionaryDirection, getDictionaryEntry, searchDictionaryEntries } from "@/lib/dictionary";
import { getDictionaryCounts, getDictionaryDbPath, getDictionarySources } from "@/lib/server/db/dictionary-core";
import { getDictionaryRuntimeConfig } from "@/lib/server/dictionary/runtime-config";

function containsChinese(text: string) {
  return /[\u3400-\u9fff]/.test(text);
}

function normalizeDirection(input: string | null): DictionaryDirection {
  if (!input) return "auto";
  const value = input.trim().toLowerCase();
  if (value === "auto" || value === "en2zh" || value === "zh2en") return value;
  return "auto";
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const direction = normalizeDirection(request.nextUrl.searchParams.get("direction"));

  if (!query) {
    return NextResponse.json({ error: "缺少查询内容。" }, { status: 400 });
  }

  const startedAt = Date.now();
  try {
    const runtime = getDictionaryRuntimeConfig();
    const counts = getDictionaryCounts();
    const dbPath = getDictionaryDbPath();
    const sources = getDictionarySources(8);

    const suggestions = searchDictionaryEntries(query, 10);
    const entry = getDictionaryEntry(query, { direction });
    const elapsedMs = Date.now() - startedAt;

    const diagnostics: string[] = [];
    diagnostics.push(`query="${query}" direction=${direction}`);
    diagnostics.push(`queryType=${containsChinese(query) ? "chinese" : "english"}`);
    diagnostics.push(`dbPath=${dbPath}`);
    diagnostics.push(`counts=${counts.englishCount}/${counts.chineseCount}/${counts.exampleCount}`);
    diagnostics.push(`suggestions=${suggestions.length}`);
    diagnostics.push(`entry=${entry ? "hit" : "miss"}`);
    diagnostics.push(`elapsedMs=${elapsedMs}`);

    if (!entry && suggestions.length > 0) {
      diagnostics.push("当前阶段更接近联想输入，建议从 suggestions 中点击词条触发详情查询。");
    }
    if (!entry && suggestions.length === 0) {
      diagnostics.push("当前词条在本地库中未命中，建议检查词形或切换查询方向。");
    }

    return NextResponse.json({
      ok: true,
      query,
      direction,
      elapsedMs,
      runtime: {
        profile: runtime.profile,
        onlineFallbackEnabled: runtime.onlineFallbackEnabled,
        runtimeBootstrapEnabled: runtime.runtimeBootstrapEnabled,
        remoteHydrationEnabled: runtime.remoteHydrationEnabled,
        remoteDbUrlConfigured: Boolean(runtime.remoteDbUrl),
      },
      dbPath,
      counts,
      sources,
      result: {
        hasEntry: Boolean(entry),
        matchedWord: typeof entry?.word === "string" ? entry.word : null,
        suggestionWords: suggestions.map((item) => item.word),
        definitionLayerCount: Array.isArray((entry as any)?.definitionLayers) ? (entry as any).definitionLayers.length : 0,
        exampleCount: Array.isArray((entry as any)?.examples) ? (entry as any).examples.length : 0,
      },
      diagnostics,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "dictionary explain failed",
        query,
        direction,
      },
      { status: 500 }
    );
  }
}

