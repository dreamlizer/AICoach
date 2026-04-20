"use client";

import { Search, Sparkles, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type LookupSuggestion = {
  word: string;
  phonetic: string | null;
  translation: string | null;
  pos: string | null;
};

type LookupEntry = {
  word: string;
  phonetic: string | null;
  translation: string | null;
  meanings?: string[];
  definitionLayers?: Array<{
    text: string;
    lang: "zh" | "en";
    role: "core" | "extended";
    source: string;
    quality: number;
    pos: string | null;
  }>;
  pos: string | null;
  audio: string | null;
  examples?: Array<{ english: string; chinese: string | null; source?: string; quality?: number }>;
};

type LookupResponse = {
  entry: LookupEntry | null;
  direction?: "auto" | "en2zh" | "zh2en";
  error?: string;
  warning?: string;
  hint?: string;
};

type SuggestResponse = {
  suggestions: LookupSuggestion[];
};

type DiagnosticsState = {
  status: number | null;
  detail: string | null;
};

type WordLookupWorkbenchProps = {
  onClose?: () => void;
};

const RECENT_HISTORY_STORAGE_KEY = "word-lab-recent-history-v1";
const RECENT_HISTORY_LIMIT = 24;

function highlightWord(text: string, word: string) {
  if (!word.trim()) return text;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));

  return parts.map((part, index) =>
    part.toLowerCase() === word.toLowerCase() ? (
      <mark
        key={`${part}-${index}`}
        className="rounded-md bg-[var(--site-accent-soft)] px-1 py-0.5 text-[var(--site-accent-strong)]"
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

function splitSuggestionText(translation: string | null) {
  if (!translation) return "";

  return translation
    .replace(/\n+/g, " / ")
    .split(/[;,，。；]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" / ");
}

function containsChinese(text: string) {
  return /[\u3400-\u9fff]/.test(text);
}

function extractChineseMeanings(text: string | null | undefined) {
  if (!text) return [] as string[];
  return text
    .replace(/\r/g, "\n")
    .split(/[\n/;；,，。]+/)
    .map((item) =>
      item
        .replace(/^\s*中文[:：]?\s*/i, "")
        .replace(/^\s*(n|v|vt|vi|adj|adv|prep|conj|pron|num|int|aux)\.?\s*[:：]?\s*/i, "")
        .trim()
    )
    .filter((item) => containsChinese(item));
}

function dedupe(values: string[], limit = values.length) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(value.trim());
    if (result.length >= limit) break;
  }
  return result;
}

function shouldAutoLookup(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return false;
  if (containsChinese(trimmed)) return trimmed.length >= 1;
  const normalized = trimmed.replace(/[^a-zA-Z]/g, "");
  return normalized.length >= 3;
}

function shouldRequestSuggestions(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return false;
  if (containsChinese(trimmed)) return trimmed.length >= 1;
  const normalized = trimmed.replace(/[^a-zA-Z]/g, "");
  return normalized.length >= 3;
}

const POS_LABEL_MAP: Record<string, string> = {
  n: "名词",
  noun: "名词",
  v: "动词",
  verb: "动词",
  vt: "及物动词",
  vi: "不及物动词",
  a: "形容词",
  adj: "形容词",
  adjective: "形容词",
  adv: "副词",
  adverb: "副词",
  prep: "介词",
  preposition: "介词",
  pron: "代词",
  pronoun: "代词",
  conj: "连词",
  conjunction: "连词",
  int: "感叹词",
  interjection: "感叹词",
  num: "数词",
  numeral: "数词",
  art: "冠词",
  article: "冠词",
  aux: "助动词",
  auxiliary: "助动词",
  modal: "情态动词",
  phr: "短语",
  phrase: "短语",
  abbr: "缩写",
};

const POS_CODE_PATTERN = /^(n|noun|v|verb|vt|vi|adj|adjective|adv|adverb|a|prep|preposition|pron|pronoun|conj|conjunction|int|interjection|num|numeral|art|article|aux|auxiliary|modal|phr|phrase|abbr)$/i;

function extractPosCodes(value: string) {
  return value
    .toLowerCase()
    .replace(/[()]/g, " ")
    .split(/[\\/,;|&\s]+/)
    .map((part) => part.trim().replace(/\./g, ""))
    .filter(Boolean)
    .filter((part) => POS_CODE_PATTERN.test(part));
}

function formatPosLabel(pos: string | null | undefined) {
  if (!pos) return "";
  const source = pos.trim();
  if (!source) return "";

  const parts = extractPosCodes(source);
  if (parts.length === 0) {
    return containsChinese(source) ? source : "";
  }
  const mapped = dedupe(parts.map((part) => POS_LABEL_MAP[part] || part));
  return mapped.join(" / ");
}

function parseMeaningDisplay(rawText: string, fallbackPos?: string | null) {
  const normalized = rawText.replace(/\\n/g, " ").replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return {
      text: "",
      lookupText: "",
      posLabel: fallbackPos ? formatPosLabel(fallbackPos) : "",
    };
  }

  const prefixMatch = normalized.match(
    /^((?:(?:n|v|vt|vi|adj|adv|a|prep|pron|conj|int|num|art|aux|modal|phr|phrase|abbr)\.?\s*(?:\/|,|&|\||and)?\s*)+)(?:[:：]\s*)?/i
  );
  const prefixPos = prefixMatch ? prefixMatch[1] : "";
  let textWithoutPrefix = prefixMatch ? normalized.slice(prefixMatch[0].length).trim() : normalized;

  const trailingPos: string[] = [];
  let trailingMatch = textWithoutPrefix.match(/(?:[\\/|]\s*|\s+)((?:n|v|vt|vi|adj|adv|a|prep|pron|conj|int|num|art|aux|modal|phr|phrase|abbr)\.?)$/i);
  while (trailingMatch) {
    trailingPos.unshift(trailingMatch[1]);
    textWithoutPrefix = textWithoutPrefix.slice(0, trailingMatch.index).trim();
    trailingMatch = textWithoutPrefix.match(/(?:[\\/|]\s*|\s+)((?:n|v|vt|vi|adj|adv|a|prep|pron|conj|int|num|art|aux|modal|phr|phrase|abbr)\.?)$/i);
  }

  const cleanedText = textWithoutPrefix.replace(/\s{2,}/g, " ").trim();
  const mergedPosSource = [prefixPos, trailingPos.join(" "), fallbackPos || ""].filter(Boolean).join(" ");
  const posLabel = formatPosLabel(mergedPosSource);

  return {
    text: cleanedText || normalized,
    lookupText: (cleanedText || normalized).replace(/^\d+[\.\)]\s*/, "").trim(),
    posLabel,
  };
}

function mergePosLabels(labels: Array<string | null | undefined>) {
  const values = labels
    .flatMap((label) => (label || "").split("/"))
    .map((item) => item.trim())
    .filter(Boolean);
  return dedupe(values).join(" / ");
}

function normalizeHistoryQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function upsertRecentHistory(history: string[], rawValue: string) {
  const nextValue = normalizeHistoryQuery(rawValue);
  if (!nextValue) return history;

  const nextLower = nextValue.toLowerCase();
  const nextHistory = [nextValue, ...history.filter((item) => normalizeHistoryQuery(item).toLowerCase() !== nextLower)];
  return nextHistory.slice(0, RECENT_HISTORY_LIMIT);
}

export function WordLookupWorkbench({ onClose }: WordLookupWorkbenchProps) {
  const [query, setQuery] = useState("promise");
  const [direction, setDirection] = useState<"auto" | "en2zh" | "zh2en">("auto");
  const [committedQuery, setCommittedQuery] = useState("promise");
  const [suggestions, setSuggestions] = useState<LookupSuggestion[]>([]);
  const [lookup, setLookup] = useState<LookupResponse | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>({ status: null, detail: null });
  const [recentHistory, setRecentHistory] = useState<string[]>([]);
  const [historyHydrated, setHistoryHydrated] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const lookupAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const cached = window.localStorage.getItem(RECENT_HISTORY_STORAGE_KEY);
      if (!cached) {
        setHistoryHydrated(true);
        return;
      }
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        setRecentHistory(parsed.filter((item) => typeof item === "string").map((item) => normalizeHistoryQuery(item)).filter(Boolean).slice(0, RECENT_HISTORY_LIMIT));
      }
    } catch {
      setRecentHistory([]);
    } finally {
      setHistoryHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !historyHydrated) return;
    try {
      window.localStorage.setItem(RECENT_HISTORY_STORAGE_KEY, JSON.stringify(recentHistory));
    } catch {
      // Ignore localStorage quota / private mode errors.
    }
  }, [recentHistory, historyHydrated]);

  useEffect(() => {
    const nextQuery = query.trim();

    if (!nextQuery || !shouldRequestSuggestions(nextQuery)) {
      suggestAbortRef.current?.abort();
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      suggestAbortRef.current?.abort();
      const controller = new AbortController();
      suggestAbortRef.current = controller;
      try {
        setSuggestLoading(true);
        const response = await fetch(
          `/api/dictionary/suggest?q=${encodeURIComponent(nextQuery)}&direction=${encodeURIComponent(direction)}`,
          {
          signal: controller.signal,
          }
        );
        if (!response.ok) {
          setSuggestions([]);
          return;
        }
        const payload = (await response.json()) as SuggestResponse;
        setSuggestions(payload.suggestions || []);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSuggestLoading(false);
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [query, direction]);

  useEffect(() => {
    const nextQuery = query.trim();
    if (!nextQuery) {
      setCommittedQuery("");
      return;
    }

    const timer = window.setTimeout(() => {
      if (shouldAutoLookup(nextQuery)) {
        setCommittedQuery(nextQuery);
      }
    }, 380);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const nextQuery = committedQuery.trim();

    if (!nextQuery) {
      setLookup(null);
      setError(null);
      setDiagnostics({ status: null, detail: null });
      setLookupLoading(false);
      return;
    }

    const controller = new AbortController();
    lookupAbortRef.current?.abort();
    lookupAbortRef.current = controller;

    (async () => {
      try {
        setLookupLoading(true);
        setError(null);
        setDiagnostics({ status: null, detail: null });

        const response = await fetch(
          `/api/dictionary/lookup?q=${encodeURIComponent(nextQuery)}&direction=${encodeURIComponent(direction)}`,
          { signal: controller.signal }
        );
        const payload = (await response.json()) as LookupResponse;

        if (!response.ok) {
          setLookup(null);
          setError(payload.error || "查询失败，请稍后再试。");
          setDiagnostics({
            status: response.status,
            detail: payload.error || "接口返回异常，但没有给出更多信息。",
          });
          return;
        }

        setLookup(payload);
        if (payload.entry) {
          setRecentHistory((prev) => upsertRecentHistory(prev, nextQuery));
        }
        if (!payload.entry && payload.hint) {
          setError(null);
          setDiagnostics({
            status: null,
            detail: payload.hint,
          });
        }
        if (payload.warning) {
          setDiagnostics({
            status: response.status,
            detail: payload.warning,
          });
        }
      } catch {
        if (controller.signal.aborted) return;
        setLookup(null);
        setError("本地词典暂时不可用，请稍后再试。");
        setDiagnostics({
          status: null,
          detail: "请求没有成功到达词典接口，可能是服务端词库未准备完成，或当前网络请求失败。",
        });
      } finally {
        if (!controller.signal.aborted) {
          setLookupLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [committedQuery, direction]);

  useEffect(() => {
    return () => {
      suggestAbortRef.current?.abort();
      lookupAbortRef.current?.abort();
      audioRef.current?.pause();
      audioRef.current = null;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const entry = lookup?.entry;
  const showInlineSuggestions = inputFocused && shouldRequestSuggestions(query) && (suggestLoading || suggestions.length > 0);

  const definitionBlocks = useMemo(() => {
    if (!entry) {
      return {
        core: [] as Array<{ text: string; lookupText: string; posLabel: string; lang: "zh" | "en" }>,
        extended: [] as Array<{ text: string; lookupText: string; posLabel: string; lang: "zh" | "en" }>,
      };
    }

    const layers = (entry.definitionLayers || [])
      .map((item) => ({
        text: (item.text || "").trim(),
        lang: item.lang,
        role: item.role,
        pos: item.pos,
      }))
      .filter((item) => item.text.length > 0);

    if (layers.length > 0) {
      return {
        core: layers
          .filter((item) => item.role === "core")
          .map((item) => {
            const parsed = parseMeaningDisplay(item.text, item.pos);
            return { text: parsed.text, lookupText: parsed.lookupText, posLabel: parsed.posLabel, lang: item.lang };
          }),
        extended: layers
          .filter((item) => item.role === "extended")
          .map((item) => {
            const parsed = parseMeaningDisplay(item.text, item.pos);
            return { text: parsed.text, lookupText: parsed.lookupText, posLabel: parsed.posLabel, lang: item.lang };
          }),
      };
    }

    const fromMeanings = (entry.meanings || []).flatMap((item) => extractChineseMeanings(item));
    const fromTranslation = extractChineseMeanings(entry.translation);
    const zhOnly = dedupe([...fromMeanings, ...fromTranslation], 8).map((text) => {
      const parsed = parseMeaningDisplay(text, null);
      return { text: parsed.text, lookupText: parsed.lookupText, posLabel: parsed.posLabel, lang: "zh" as const };
    });
    return { core: zhOnly, extended: [] as Array<{ text: string; lookupText: string; posLabel: string; lang: "zh" | "en" }> };
  }, [entry]);

  const entryPosLabel = useMemo(() => {
    if (!entry) return "";
    return mergePosLabels([
      formatPosLabel(entry.pos),
      ...definitionBlocks.core.map((item) => item.posLabel),
      ...definitionBlocks.extended.map((item) => item.posLabel),
    ]);
  }, [entry, definitionBlocks]);

  const examples =
    entry?.examples
      ?.map((item) => ({ en: item.english, zh: item.chinese || "", quality: Number(item.quality || 0), source: item.source || "" }))
      ?.filter((item) => item.en) ?? [];
  const primaryExamples = examples.filter((item) => item.quality >= 0.75);
  const secondaryExamples = examples.filter((item) => item.quality < 0.75);

  const runLinkedLookup = (nextQuery: string) => {
    const trimmedNext = nextQuery.trim();
    const trimmedCurrent = query.trim();
    if (!trimmedNext || trimmedNext === trimmedCurrent) return;

    setQueryHistory((prev) => (trimmedCurrent ? [...prev, trimmedCurrent] : prev));
    setQuery(trimmedNext);
    setCommittedQuery(trimmedNext);
  };

  const handleBackLookup = () => {
    setQueryHistory((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const previousQuery = next.pop();
      if (previousQuery) {
        setQuery(previousQuery);
        setCommittedQuery(previousQuery);
      }
      return next;
    });
  };

  const clearRecentHistory = () => {
    setRecentHistory([]);
  };

  const handleSpeak = () => {
    if (!entry?.word || typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (entry.audio) {
      if (speaking && audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setSpeaking(false);
        return;
      }

      const audio = new Audio(entry.audio);
      audioRef.current = audio;
      setSpeaking(true);
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      void audio.play().catch(() => setSpeaking(false));
      return;
    }

    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(entry.word);
    const voices = synth.getVoices();
    const englishVoice =
      voices.find((voice) => voice.lang.toLowerCase().startsWith("en-us")) ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ||
      null;

    if (englishVoice) {
      utterance.voice = englishVoice;
      utterance.lang = englishVoice.lang;
    } else {
      utterance.lang = "en-US";
    }

    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    utteranceRef.current = utterance;
    setSpeaking(true);
    synth.speak(utterance);
  };

  const showResult = Boolean(entry);
  const activeEntry = entry;

  return (
    <section className="relative mx-auto flex w-full max-w-[1280px] flex-col gap-3 overflow-hidden rounded-[20px] border border-[#e4dbd5] bg-[#f6f0e8] p-3 shadow-[0_14px_30px_rgba(37,22,16,0.10)] md:gap-6 md:rounded-[32px] md:p-7 md:shadow-[0_26px_60px_rgba(37,22,16,0.12)]">
      <div className="pointer-events-none absolute -left-28 -top-28 hidden h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(129,74,48,0.18),rgba(129,74,48,0))] md:block" />
      <div className="pointer-events-none absolute -bottom-32 right-0 hidden h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(106,132,96,0.2),rgba(106,132,96,0))] md:block" />

      <div className="relative rounded-[16px] border border-[#dfd2c7] bg-[#f9f4ee]/90 p-4 md:rounded-[24px] md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.3em] text-[#866047]">WORD LAB</div>
            <h1 className="mt-1 font-['Georgia'] text-[42px] font-semibold leading-[0.95] tracking-[-0.04em] text-[#2e1f19] md:mt-2 md:text-[52px]">简易查词</h1>
            <p className="mt-1 hidden text-xs text-[#7f6757] md:mt-2 md:block md:text-sm">先快查，再深入。</p>
          </div>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭并返回首页"
              className="site-hover-chip inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d6c8ba] bg-white/80 text-[#3b2a20] md:h-11 md:w-11"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative grid gap-3 lg:grid-cols-[340px_minmax(0,1fr)] md:gap-5">
        <aside className="rounded-none border-0 bg-transparent p-0 shadow-none md:rounded-[24px] md:border md:border-[#dfd2c6] md:bg-[#f8f1e8]/92 md:p-5 md:shadow-[0_12px_28px_rgba(42,27,18,0.08)]">
          <div className="rounded-[14px] border border-[#dccfbe] bg-white/70 p-3 md:rounded-[20px] md:p-4">
            <label className="mb-2 block text-xs font-semibold tracking-[0.15em] text-[#7d6350]">词语输入</label>
            <div className="mb-2 inline-flex rounded-full border border-[#dacbbc] bg-white p-1 text-[11px] md:mb-3 md:text-xs">
              {[
                { key: "auto", label: "自动" },
                { key: "en2zh", label: "英译中" },
                { key: "zh2en", label: "中译英" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setDirection(item.key as "auto" | "en2zh" | "zh2en")}
                  className={`rounded-full px-3 py-1 transition ${
                    direction === item.key ? "bg-[#2f221a] text-white" : "text-[#7a6250] hover:bg-[#f3e9df]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <div className="flex items-center gap-3 rounded-[12px] border border-[#daccbc] bg-white px-3 py-2.5 md:rounded-[16px] md:px-4 md:py-3">
                <Search className="h-4 w-4 text-[#8b7360]" />
                <input
                  value={query}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => {
                    window.setTimeout(() => setInputFocused(false), 120);
                  }}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setCommittedQuery(query.trim());
                      setInputFocused(false);
                    }
                  }}
                  placeholder="例如 promise / 人民 / keep in mind"
                  className="w-full bg-transparent text-[14px] text-[#2f221a] outline-none placeholder:text-[#a18674] md:text-[15px]"
                />
              </div>

              {showInlineSuggestions ? (
                <div className="absolute left-0 right-0 z-20 mt-1 rounded-[12px] border border-[#d9ccbf] bg-[#fffdfa] p-1.5 shadow-[0_12px_24px_rgba(42,27,18,0.14)] md:rounded-[14px]">
                  {suggestLoading ? (
                    <div className="rounded-[10px] px-3 py-2 text-xs text-[#8d7463]">联想更新中...</div>
                  ) : (
                    <div className="max-h-[280px] space-y-1 overflow-auto">
                      {suggestions.slice(0, 8).map((item) => (
                        <button
                          key={`inline-${item.word}-${item.translation}`}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            runLinkedLookup(item.word);
                            setInputFocused(false);
                          }}
                          className="site-hover-chip w-full rounded-[10px] border border-[#e6dacd] bg-white px-3 py-2 text-left"
                        >
                          <div className="text-[15px] font-medium text-[#2f221a]">{item.word}</div>
                          <div className="mt-0.5 line-clamp-1 text-[12px] text-[#7d6350]">{splitSuggestionText(item.translation)}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="mt-1 min-h-4 text-[11px] font-medium text-[#8f7563] md:mt-2 md:min-h-5 md:text-xs">
              {lookupLoading ? "词条查询中..." : suggestLoading ? "联想更新中..." : ""}
            </div>

            <div className="mt-2 rounded-[12px] border border-[#dccfbe] bg-white/70 p-2.5 md:mt-3 md:rounded-[14px] md:p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold tracking-[0.12em] text-[#7d6350] md:text-xs">最近查过</div>
                {recentHistory.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearRecentHistory}
                    className="site-hover-chip rounded-full border border-[#d8cabd] bg-white px-2.5 py-1 text-[11px] text-[#7a6250] md:text-xs"
                  >
                    清空
                  </button>
                ) : null}
              </div>
              {recentHistory.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {recentHistory.slice(0, 10).map((historyItem) => (
                    <button
                      key={historyItem}
                      type="button"
                      onClick={() => runLinkedLookup(historyItem)}
                      className="site-hover-chip rounded-full border border-[#d8cabd] bg-white px-2.5 py-1 text-left text-[11px] text-[#6f5848] md:px-3 md:text-xs"
                    >
                      {historyItem}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[10px] border border-dashed border-[#d8cabd] bg-white/70 px-2.5 py-2 text-[11px] text-[#8d7463] md:text-xs">
                  成功查到的词会记录在这里，方便回看。
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 hidden md:block">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#d8cabd] bg-white/70 px-3 py-1 text-xs text-[#7a6250]">
              <Sparkles className="h-3.5 w-3.5" />
              智能联想
            </div>
            <div className="max-h-[470px] space-y-2.5 overflow-auto pr-1">
              {suggestions.length > 0 ? (
                suggestions.slice(0, 12).map((item) => (
                  <button
                    key={`${item.word}-${item.translation}`}
                    type="button"
                    onClick={() => runLinkedLookup(item.word)}
                    className="site-hover-chip w-full rounded-[14px] border border-[#dcccc0] bg-white/80 px-3 py-2 text-left"
                  >
                    <div className="text-[17px] font-medium text-[#2f221a]">{item.word}</div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-[#7d6350]">{splitSuggestionText(item.translation)}</div>
                  </button>
                ))
              ) : (
                <div className="rounded-[14px] border border-dashed border-[#d7c8b9] bg-white/60 px-3 py-4 text-sm text-[#8d7463]">
                  输入后这里会展示相关词与短语。
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="rounded-none border-0 bg-transparent p-0 shadow-none md:rounded-[24px] md:border md:border-[#dfd2c6] md:bg-[#faf5ee]/92 md:p-5 md:shadow-[0_12px_28px_rgba(42,27,18,0.08)]">
          {(error && diagnostics.detail) || (!error && !entry && diagnostics.detail && query.trim()) ? (
            <div
              className={`mb-4 rounded-[16px] px-4 py-3 text-sm leading-7 ${
                error
                  ? "border border-[#e4b8ab] bg-[#fff4ef] text-[#7b4a3a]"
                  : "border border-[#e0d4c8] bg-[#fbf7f2] text-[#6b5648]"
              }`}
            >
              <div className={`font-semibold ${error ? "text-[#553127]" : "text-[#5f4a3d]"}`}>{error ? "词典加载诊断" : "查词提示"}</div>
              <div className="mt-1">
                {diagnostics.status ? `接口状态 ${diagnostics.status}：` : ""}
                {diagnostics.detail}
              </div>
            </div>
          ) : null}

          {showResult && activeEntry ? (
            <div className="space-y-4">
              <div className="rounded-[14px] border border-[#dbcdbf] bg-white/70 p-3 md:rounded-[20px] md:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold tracking-[0.15em] text-[#7a6250]">词条结果</div>
                  {queryHistory.length > 0 ? (
                    <button
                      type="button"
                      onClick={handleBackLookup}
                      className="site-hover-chip rounded-full border border-[#d8cabd] bg-white px-3 py-1.5 text-sm text-[#6e5646]"
                    >
                      回到上一个词条
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-end gap-2.5 md:gap-3">
                        <div className="font-['Georgia'] text-[56px] font-semibold leading-[0.9] tracking-[-0.04em] text-[#281a14] md:text-[72px]">{activeEntry.word}</div>
                        {entryPosLabel ? <span className="mb-1 rounded-full border border-[#dccfbe] px-2.5 py-1 text-sm text-[#775f4f]">{entryPosLabel}</span> : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-sm text-[#775f4f]">
                      {activeEntry.phonetic ? <span className="font-medium">{activeEntry.phonetic}</span> : null}
                      <button
                        type="button"
                        onClick={handleSpeak}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                          speaking
                            ? "border-[#9f476d] bg-[#f4dce7] text-[#8f355f]"
                            : "border-[#d8cabd] bg-white text-[#6e5646] hover:border-[#bca895] hover:text-[#2b1d17]"
                        }`}
                      >
                        <Volume2 className="h-4 w-4" />
                        {speaking ? "停止发音" : entry.audio ? "播放原声" : "播放发音"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[12px] border border-[#e0d4c8] bg-[#fdfaf6] p-3 md:rounded-[16px] md:p-4">
                    {definitionBlocks.core.length > 0 ? (
                      <div className="space-y-4">
                        <div>
                          <div className="mb-2 text-xs font-semibold tracking-[0.12em] text-[#8f7563]">核心释义</div>
                          <div className="grid grid-cols-2 gap-2 md:gap-2.5">
                            {definitionBlocks.core.map((meaning, index) => (
                              <button
                                type="button"
                                key={`${meaning.text}-${index}`}
                                onClick={() => runLinkedLookup(meaning.lookupText)}
                                className="rounded-[10px] border border-[#e5d8cb] bg-white px-2.5 py-2 text-left text-[13px] leading-5 text-[#30231b] transition hover:-translate-y-0.5 hover:border-[#cdb9a7] md:rounded-[12px] md:px-3 md:py-2.5 md:text-[15px] md:leading-6"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-[#a75b39]">{index + 1}.</span>
                                  <div className="min-w-0">
                                    {meaning.posLabel ? (
                                      <div className="mb-1 inline-flex rounded-full border border-[#e8dacc] bg-[#fff8f2] px-2 py-0.5 text-[11px] font-medium text-[#8b6a58] md:text-xs">
                                        {meaning.posLabel}
                                      </div>
                                    ) : null}
                                    <div className={meaning.lang === "en" ? "italic" : ""}>{meaning.text}</div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                        {definitionBlocks.extended.length > 0 ? (
                          <div>
                            <div className="mb-2 text-xs font-semibold tracking-[0.12em] text-[#8f7563]">扩展释义</div>
                            <div className="grid grid-cols-2 gap-2 md:gap-2.5">
                              {definitionBlocks.extended.map((meaning, index) => (
                                <div
                                  key={`${meaning.text}-${index}`}
                                  className="rounded-[10px] border border-[#eadfd4] bg-white/80 px-2.5 py-2 text-[12px] leading-5 text-[#5d493d] md:rounded-[12px] md:px-3 md:py-2.5 md:text-[14px] md:leading-6"
                                >
                                  <div className="flex items-start gap-2">
                                    <span className="font-semibold text-[#b66e4c]">{index + 1}.</span>
                                    <div className="min-w-0">
                                      {meaning.posLabel ? (
                                        <div className="mb-1 inline-flex rounded-full border border-[#efe2d6] bg-[#fffaf6] px-2 py-0.5 text-[11px] font-medium text-[#95715d] md:text-xs">
                                          {meaning.posLabel}
                                        </div>
                                      ) : null}
                                      <div className={meaning.lang === "en" ? "italic" : ""}>{meaning.text}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-[12px] border border-[#e5d8cb] bg-white px-3 py-2.5 text-sm leading-6 text-[#7f6756]">当前词条暂未收录可用中文释义。</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-[12px] border border-[#dbcdbf] bg-white/70 p-2.5 md:rounded-[20px] md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-semibold tracking-[0.15em] text-[#7a6250]">例句</div>
                  <div className="text-xs text-[#7f6756]">{examples.length > 0 ? `${examples.length} 条例句` : "例句补充中"}</div>
                </div>

                <div className="mt-2 grid gap-2 md:mt-4 md:gap-3">
                  {(primaryExamples.length > 0 ? primaryExamples : examples).length > 0 ? (
                    (primaryExamples.length > 0 ? primaryExamples : examples).map((example) => (
                      <article key={`${example.en}-${example.zh}`} className="rounded-[12px] border border-[#e4d8cc] bg-white px-3 py-2.5 md:rounded-[16px] md:px-5 md:py-4">
                        <p className="text-[15px] leading-7 text-[#2c2018] md:text-[17px] md:leading-8">{highlightWord(example.en, activeEntry.word)}</p>
                        {example.zh ? <p className="mt-1 text-[13px] leading-6 text-[#7c6556] md:mt-2 md:text-[15px] md:leading-7">{example.zh}</p> : null}
                        {example.source ? <p className="mt-1 text-[10px] text-[#a38a79] md:text-[11px]">来源: {example.source}</p> : null}
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[12px] border border-[#e4d8cc] bg-white px-3 py-2.5 text-xs leading-6 text-[#7f6756] md:rounded-[16px] md:px-4 md:py-4 md:text-sm md:leading-7">这条词目的本地例句还在补充中，后续会继续扩展。</div>
                  )}
                </div>
                {secondaryExamples.length > 0 ? (
                  <details className="mt-2 rounded-[12px] border border-[#eadfd4] bg-white/80 p-2.5 md:mt-4 md:rounded-[14px] md:p-3">
                    <summary className="cursor-pointer text-xs font-medium text-[#6b5649] md:text-sm">更多例句（质量较低）</summary>
                    <div className="mt-2 grid gap-2 md:mt-3 md:gap-3">
                      {secondaryExamples.map((example) => (
                        <article key={`low-${example.en}-${example.zh}`} className="rounded-[10px] border border-[#eee2d7] bg-white px-3 py-2.5 md:rounded-[12px] md:px-4 md:py-3">
                          <p className="text-[13px] leading-6 text-[#3c2d23] md:text-[15px] md:leading-7">{highlightWord(example.en, activeEntry.word)}</p>
                          {example.zh ? <p className="mt-1 text-[12px] leading-5 text-[#7e6758] md:text-[13px] md:leading-6">{example.zh}</p> : null}
                          {example.source ? <p className="mt-1 text-[10px] text-[#ab9382] md:text-[11px]">来源: {example.source}</p> : null}
                        </article>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>

            </div>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[14px] border border-dashed border-[#d8cabd] bg-white/60 px-4 text-center md:min-h-[520px] md:rounded-[20px] md:px-6">
              <div className="font-['Georgia'] text-[30px] font-semibold text-[#2f2119]">{lookupLoading ? "正在查询词典..." : error ? "暂时没有查到结果" : "输入一个词试试看"}</div>
              <div className="mt-3 max-w-[28rem] text-sm leading-7 text-[#7f6756]">{error || "支持单词、词组和较短句子。先快查，再深入。"}</div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
