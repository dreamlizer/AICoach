import { NextRequest, NextResponse } from "next/server";
import { searchDictionaryEntries } from "@/lib/dictionary";

const SUGGEST_CACHE_TTL_MS = 30_000;
const suggestCache = new Map<string, { expiresAt: number; payload: { suggestions: ReturnType<typeof searchDictionaryEntries> } }>();

function readSuggestCache(key: string) {
  const hit = suggestCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    suggestCache.delete(key);
    return null;
  }
  return hit.payload;
}

function writeSuggestCache(key: string, payload: { suggestions: ReturnType<typeof searchDictionaryEntries> }) {
  suggestCache.set(key, { expiresAt: Date.now() + SUGGEST_CACHE_TTL_MS, payload });
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const direction = (request.nextUrl.searchParams.get("direction") || "auto").trim().toLowerCase();
  if (!query) {
    return NextResponse.json({ suggestions: [], direction });
  }
  if (query.length > 80) {
    return NextResponse.json({ suggestions: [], direction });
  }

  const key = query.toLowerCase();
  const cached = readSuggestCache(key);
  if (cached) {
    return NextResponse.json({ ...cached, direction });
  }

  try {
    const suggestions = searchDictionaryEntries(query, 12);
    const payload = { suggestions };
    writeSuggestCache(key, payload);
    return NextResponse.json({ ...payload, direction });
  } catch {
    // Suggestion stage should always be soft-fail and never break typing UX.
    return NextResponse.json({ suggestions: [], direction });
  }
}
