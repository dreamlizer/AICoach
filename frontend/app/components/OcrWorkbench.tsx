"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Search, Settings2, X } from "lucide-react";
import { createWorker, type Worker } from "tesseract.js";
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { SettingsModal } from "./SettingsModal";
import {
  defaultOcrWorkbenchSettings,
  OCR_DRAFT_STORAGE_KEY,
  OCR_HISTORY_STORAGE_KEY,
  OCR_SETTINGS_EVENT,
  readOcrWorkbenchSettings,
  writeOcrWorkbenchSettings,
  type OcrWorkbenchSettings,
} from "@/lib/ocr_workbench";
import { getOcrStylePreset, ocrStylePresets, type OcrStylePresetId } from "@/lib/ocr_style_presets";

type OcrPageStatus = "idle" | "ocr_processing" | "ocr_done" | "structuring" | "done" | "error";

type OcrPage = {
  id: string;
  fileName: string;
  previewUrl: string;
  order: number;
  status: OcrPageStatus;
  progress: number;
  extractedText: string;
  errorMessage?: string;
  warning?: string;
};

type HistoryEntry = {
  id: string;
  title: string;
  savedAt: string;
  content: string;
  pageCount: number;
  stylePresetId: OcrStylePresetId;
};

type PreviewBlock =
  | { kind: "title" | "heading" | "subheading" | "paragraph"; text: string }
  | { kind: "table"; text: string };

const OCR_LANG = "chi_sim+eng";

function createPageId(file: File, index: number) {
  return `${file.name}-${file.lastModified}-${index}`;
}

function createHistoryId() {
  return `ocr-history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePageOrder(pages: OcrPage[]) {
  return pages.map((page, index) => ({ ...page, order: index + 1 }));
}

function compactFileName(fileName: string) {
  const extensionIndex = fileName.lastIndexOf(".");
  const hasExtension = extensionIndex > 0;
  const extension = hasExtension ? fileName.slice(extensionIndex) : "";
  const baseName = hasExtension ? fileName.slice(0, extensionIndex) : fileName;
  if (fileName.length <= 24) return fileName;
  return `${baseName.slice(0, 10)}...${baseName.slice(-8)}${extension}`;
}

function formatPageStatus(page: OcrPage) {
  if (page.errorMessage) return `错误：${page.errorMessage}`;
  switch (page.status) {
    case "done":
      return "已完成";
    case "ocr_processing":
      return "识别中";
    case "ocr_done":
      return "已识别";
    case "structuring":
      return "整理中";
    case "error":
      return "处理失败";
    default:
      return "待处理";
  }
}

function pageStatusClass(page: OcrPage) {
  if (page.errorMessage || page.status === "error") return "image-card-status-error";
  switch (page.status) {
    case "done":
      return "image-card-status-done";
    case "ocr_processing":
    case "structuring":
      return "image-card-status-processing";
    case "ocr_done":
      return "image-card-status-ready";
    default:
      return "image-card-status-idle";
  }
}

function shouldShowProgress(page: OcrPage) {
  return page.progress > 0 || ["ocr_processing", "ocr_done", "structuring", "done"].includes(page.status);
}

function looksLikeHeading(block: string) {
  if (block.length <= 24 && /^(第.+[章节部分]|[一二三四五六七八九十]+[、.．]|[0-9]+[、.．])/.test(block)) return true;
  return block.length <= 18 && !/[。！？；：]/.test(block);
}

function looksLikeSubheading(block: string) {
  if (!block || block.length > 28 || /[。！？]/.test(block)) return false;
  return /^[（(]?[一二三四五六七八九十]+[）)]|^[0-9]+\.[0-9]+|^[0-9]+[)）]/.test(block) || block.includes("：");
}

function parsePreviewBlocks(content: string): PreviewBlock[] {
  return content
    .split(/\r?\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .slice(0, 7)
    .map((block, index) => {
      if (block.startsWith("[表格块开始]")) {
        return { kind: "table", text: block.replace(/\[表格块开始\]|\[表格块结束\]/g, "").trim() };
      }
      if (index === 0) return { kind: "title", text: block };
      if (looksLikeHeading(block)) return { kind: "heading", text: block };
      if (looksLikeSubheading(block)) return { kind: "subheading", text: block };
      return { kind: "paragraph", text: block };
    });
}

function parseDocumentBlocks(content: string): PreviewBlock[] {
  return content
    .split(/\r?\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      if (block.startsWith("[表格块开始]")) {
        return { kind: "table", text: block.replace(/\[表格块开始\]|\[表格块结束\]/g, "").trim() };
      }
      if (index === 0) return { kind: "title", text: block };
      if (looksLikeHeading(block)) return { kind: "heading", text: block };
      if (looksLikeSubheading(block)) return { kind: "subheading", text: block };
      return { kind: "paragraph", text: block };
    });
}

function buildRawDocumentText(pages: OcrPage[], preservePageDivider: boolean) {
  const chunks = pages
    .filter((page) => page.extractedText.trim())
    .map((page) => `第 ${page.order} 页 | ${page.fileName}\n${page.extractedText.trim()}`);
  return preservePageDivider ? chunks.join("\n\n------------------------------\n\n") : chunks.join("\n\n");
}

function buildHistoryTitle(content: string, pages: OcrPage[]) {
  const fromFile = pages[0]?.fileName?.replace(/\.[^.]+$/, "");
  if (fromFile) return `${fromFile} 整理稿`;
  const firstBlock = content.split(/\r?\n\s*\n/).map((block) => block.trim()).find(Boolean);
  return firstBlock?.slice(0, 24) || "OCR 整理稿";
}

function escapeRegExp(source: string) {
  return source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSearchSnippets(content: string, query: string) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return [];

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const snippets: string[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].toLowerCase().includes(keyword)) continue;
    const excerpt = [lines[index - 1], lines[index], lines[index + 1]]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!excerpt || seen.has(excerpt)) continue;
    seen.add(excerpt);
    snippets.push(excerpt);
    if (snippets.length >= 3) break;
  }

  if (snippets.length > 0) return snippets;

  const collapsed = content.replace(/\s+/g, " ").trim();
  if (!collapsed) return [];

  const lower = collapsed.toLowerCase();
  const fallbackSnippets: string[] = [];
  let cursor = 0;

  while (cursor < lower.length && fallbackSnippets.length < 3) {
    const matchIndex = lower.indexOf(keyword, cursor);
    if (matchIndex === -1) break;
    const start = Math.max(0, matchIndex - 26);
    const end = Math.min(collapsed.length, matchIndex + keyword.length + 26);
    const excerpt = `${start > 0 ? "…" : ""}${collapsed.slice(start, end)}${end < collapsed.length ? "…" : ""}`;
    if (!seen.has(excerpt)) {
      seen.add(excerpt);
      fallbackSnippets.push(excerpt);
    }
    cursor = matchIndex + keyword.length;
  }

  return fallbackSnippets;
}

function renderHighlightedText(text: string, query: string) {
  const keyword = query.trim();
  if (!keyword) return text;

  const segments = text.split(new RegExp(`(${escapeRegExp(keyword)})`, "ig"));
  return segments.map((segment, index) =>
    segment.toLowerCase() === keyword.toLowerCase() ? <mark key={`${segment}-${index}`}>{segment}</mark> : segment
  );
}

function formatUsageLabel(totalTokens?: number) {
  return totalTokens ? `DeepSeek ${totalTokens} tokens` : null;
}

type ExportStyleConfig = {
  headingColor?: string;
  paragraphFont: string;
  headingFont: string;
  titleFont: string;
};

function getExportStyleConfig(stylePresetId: OcrStylePresetId): ExportStyleConfig {
  switch (stylePresetId) {
    case "modern_business":
      return { headingColor: "1F4D78", paragraphFont: "Calibri", headingFont: "Calibri", titleFont: "Calibri" };
    case "editorial_serif":
      return { headingColor: "4A3B2A", paragraphFont: "Georgia", headingFont: "Georgia", titleFont: "Georgia" };
    case "classic_book":
      return { headingColor: "3A332A", paragraphFont: "Times New Roman", headingFont: "Times New Roman", titleFont: "Times New Roman" };
    case "minimal_clean":
      return { headingColor: "334155", paragraphFont: "Calibri", headingFont: "Calibri", titleFont: "Calibri" };
    case "scholarly_blue":
      return { headingColor: "1E3A8A", paragraphFont: "Cambria", headingFont: "Cambria", titleFont: "Cambria" };
    default:
      return { headingColor: "1F2937", paragraphFont: "Calibri", headingFont: "Calibri", titleFont: "Calibri" };
  }
}

function buildWordDocument(content: string, stylePresetId: OcrStylePresetId) {
  const blocks = parseDocumentBlocks(content);
  const style = getExportStyleConfig(stylePresetId);
  const paragraphs = blocks.map((block) => {
    if (block.kind === "title") {
      return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 220 },
        children: [
          new TextRun({
            text: block.text,
            bold: true,
            size: 36,
            font: style.titleFont,
            color: style.headingColor,
          }),
        ],
      });
    }

    if (block.kind === "heading") {
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: block.text,
            bold: true,
            size: 30,
            font: style.headingFont,
            color: style.headingColor,
          }),
        ],
      });
    }

    if (block.kind === "subheading") {
      return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 180, after: 90 },
        children: [
          new TextRun({
            text: block.text,
            bold: true,
            size: 26,
            font: style.headingFont,
            color: style.headingColor,
          }),
        ],
      });
    }

    if (block.kind === "table") {
      return new Paragraph({
        spacing: { before: 140, after: 140 },
        children: [
          new TextRun({
            text: `【表格内容】${block.text || "（内容为空）"}`,
            size: 22,
            font: style.paragraphFont,
            color: "374151",
          }),
        ],
      });
    }

    return new Paragraph({
      spacing: { after: 140, line: 420 },
      indent: { firstLine: 420 },
      children: [
        new TextRun({
          text: block.text,
          size: 24,
          font: style.paragraphFont,
        }),
      ],
    });
  });

  return new Document({
    sections: [
      {
        children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ children: [new TextRun(" ")] })],
      },
    ],
  });
}

function HistoryDialog(props: {
  isOpen: boolean;
  entries: HistoryEntry[];
  onClose: () => void;
  onRestore: (entryId: string) => void;
  onDelete: (entryId: string) => void;
}) {
  const { isOpen, entries, onClose, onRestore, onDelete } = props;
  const [query, setQuery] = useState("");
  if (!isOpen) return null;
  const keyword = query.trim();
  const filteredEntries = entries.filter((entry) => {
    const normalizedKeyword = keyword.toLowerCase();
    if (!normalizedKeyword) return true;
    return entry.title.toLowerCase().includes(normalizedKeyword) || entry.content.toLowerCase().includes(normalizedKeyword);
  });

  return createPortal(
    <div className="ocr-layout-shell history-dialog-overlay" onClick={onClose}>
      <div className="history-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="history-dialog-header">
          <div>
            <p className="eyebrow">OCR History</p>
            <h2>历史记录</h2>
            <p className="history-dialog-summary">每次完成 OCR 和整理后，这里都会保留一份结果草稿。你可以随时恢复到右侧面板继续编辑。</p>
          </div>
          <div className="history-dialog-actions">
            <label className="history-search-field" aria-label="搜索历史记录">
              <Search className="h-4 w-4" />
              <input
                type="search"
                placeholder="搜索历史文字"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button className="secondary-button history-dialog-close" type="button" onClick={onClose}>
              关闭
            </button>
          </div>
        </div>
        <div className="history-panel">
          {entries.length === 0 ? (
            <div className="empty-state history-empty-state empty-state-workbench">
              <strong>还没有历史记录</strong>
              <span>先完成一次识别和整理，这里就会出现可恢复的历史草稿。</span>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="empty-state history-empty-state empty-state-workbench">
              <strong>没有匹配结果</strong>
              <span>换个关键词试试，标题和正文片段都会参与搜索。</span>
            </div>
          ) : (
            <div className="history-cards">
              {filteredEntries.map((entry) => (
                <article className="history-card" key={entry.id}>
                  <div className="history-card-meta">
                    <strong>{entry.title}</strong>
                    <span>
                      {new Date(entry.savedAt).toLocaleString("zh-CN")} · {entry.pageCount} 页 · {getOcrStylePreset(entry.stylePresetId).label}
                    </span>
                    {keyword ? (
                      <div className="history-snippet-list">
                        {buildSearchSnippets(entry.content, keyword).map((snippet, snippetIndex) => (
                          <p className="history-snippet" key={`${entry.id}-snippet-${snippetIndex}`}>
                            {renderHighlightedText(snippet, keyword)}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <span>{entry.content.slice(0, 120)}</span>
                    )}
                  </div>
                  <div className="history-card-actions">
                    <button className="secondary-button result-tool-button" type="button" onClick={() => onRestore(entry.id)}>
                      恢复
                    </button>
                    <button className="secondary-button result-tool-button" type="button" onClick={() => onDelete(entry.id)}>
                      删除
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

type OcrWorkbenchProps = {
  onClose?: () => void;
};

export function OcrWorkbench({ onClose }: OcrWorkbenchProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workerRef = useRef<Promise<Worker> | null>(null);
  const pagesRef = useRef<OcrPage[]>([]);
  const settingsRef = useRef<OcrWorkbenchSettings>(defaultOcrWorkbenchSettings);
  const activePageIdRef = useRef<string | null>(null);
  const progressFrameRef = useRef<number | null>(null);
  const pendingProgressRef = useRef<Record<string, number>>({});
  const taskTokenRef = useRef(0);

  const [pages, setPages] = useState<OcrPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [resultText, setResultText] = useState("");
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settings, setSettings] = useState<OcrWorkbenchSettings>(defaultOcrWorkbenchSettings);
  const [processingPageId, setProcessingPageId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState("等待开始");
  const [deepseekUsageLabel, setDeepseekUsageLabel] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestructuring, setIsRestructuring] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<"structured" | "raw">("structured");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copyToastVisible, setCopyToastVisible] = useState(false);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const applySettings = useCallback((nextSettings: OcrWorkbenchSettings) => {
    setSettings(nextSettings);
    settingsRef.current = nextSettings;
  }, []);

  const persistSettings = useCallback((nextSettings: OcrWorkbenchSettings) => {
    applySettings(nextSettings);
    writeOcrWorkbenchSettings(nextSettings);
  }, [applySettings]);

  useEffect(() => {
    document.documentElement.dataset.workspaceMode = "ocr";
    const nextSettings = readOcrWorkbenchSettings();
    applySettings(nextSettings);

    try {
      const cachedDraft = window.localStorage.getItem(OCR_DRAFT_STORAGE_KEY);
      const cachedHistory = window.localStorage.getItem(OCR_HISTORY_STORAGE_KEY);
      if (cachedDraft) setResultText(cachedDraft);
      if (cachedHistory) setHistoryEntries(JSON.parse(cachedHistory) as HistoryEntry[]);
    } catch {
      window.localStorage.removeItem(OCR_DRAFT_STORAGE_KEY);
      window.localStorage.removeItem(OCR_HISTORY_STORAGE_KEY);
    }

    const handleSettingsChange = () => applySettings(readOcrWorkbenchSettings());
    window.addEventListener(OCR_SETTINGS_EVENT, handleSettingsChange as EventListener);

    return () => {
      delete document.documentElement.dataset.workspaceMode;
      window.removeEventListener(OCR_SETTINGS_EVENT, handleSettingsChange as EventListener);
    };
  }, [applySettings]);

  useEffect(() => {
    window.localStorage.setItem(OCR_DRAFT_STORAGE_KEY, resultText);
  }, [resultText]);

  useEffect(() => {
    window.localStorage.setItem(OCR_HISTORY_STORAGE_KEY, JSON.stringify(historyEntries));
  }, [historyEntries]);

  useEffect(() => {
    return () => {
      pagesRef.current.forEach((page) => URL.revokeObjectURL(page.previewUrl));
    };
  }, []);

  useEffect(() => {
    return () => {
      void (async () => {
        if (!workerRef.current) return;
        const worker = await workerRef.current;
        await worker.terminate();
      })();
    };
  }, []);

  const flushProgressUpdates = useCallback(() => {
    progressFrameRef.current = null;
    const pendingProgress = pendingProgressRef.current;
    pendingProgressRef.current = {};
    const pendingPageIds = Object.keys(pendingProgress);
    if (!pendingPageIds.length) return;

    setPages((currentPages) => {
      let changed = false;
      const nextPages = currentPages.map((page) => {
        const nextProgress = pendingProgress[page.id];
        if (typeof nextProgress !== "number") return page;
        const clamped = Math.max(0, Math.min(1, nextProgress));
        if (Math.abs(page.progress - clamped) < 0.001) return page;
        changed = true;
        return { ...page, progress: clamped };
      });
      return changed ? nextPages : currentPages;
    });
  }, []);

  const queuePageProgressUpdate = useCallback((pageId: string, progress: number) => {
    pendingProgressRef.current[pageId] = progress;
    if (progressFrameRef.current !== null) return;
    progressFrameRef.current = window.requestAnimationFrame(flushProgressUpdates);
  }, [flushProgressUpdates]);

  useEffect(() => {
    return () => {
      taskTokenRef.current += 1;
      if (progressFrameRef.current !== null) {
        window.cancelAnimationFrame(progressFrameRef.current);
      }
      progressFrameRef.current = null;
      pendingProgressRef.current = {};
    };
  }, []);

  const handleFilesAdded = useCallback((fileList: FileList | File[]) => {
    if (isProcessing) return;
    const imageFiles = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) return;

    const nextPages = imageFiles.map((file, index) => ({
      id: createPageId(file, index),
      fileName: file.name,
      previewUrl: URL.createObjectURL(file),
      order: 0,
      status: "idle" as const,
      progress: 0,
      extractedText: "",
    }));

    setPages((currentPages) => normalizePageOrder([...currentPages, ...nextPages]));
    setSelectedPageId((currentSelectedPageId) => currentSelectedPageId ?? nextPages[0]?.id ?? null);
    setProcessingStatus("等待开始");
  }, [isProcessing]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (isProcessing) return;
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith("image/"));
      if (!files.length) return;
      event.preventDefault();
      handleFilesAdded(files);
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleFilesAdded, isProcessing]);

  const currentPage = useMemo(() => pages.find((page) => page.id === selectedPageId) ?? pages[0] ?? null, [pages, selectedPageId]);
  const currentOcrResult = currentPage?.extractedText.trim() ?? "";
  const previewBlocks = useMemo(() => parsePreviewBlocks(resultText), [resultText]);
  const activePreset = useMemo(() => getOcrStylePreset(settings.stylePresetId), [settings.stylePresetId]);
  const finishedCount = useMemo(() => pages.filter((page) => page.status === "done" || page.status === "ocr_done").length, [pages]);
  const lastSavedLabel = historyEntries.length > 0 ? "当前内容会自动保存" : "等待生成整理结果";
  const statusLabel = processingPageId ? processingStatus : resultText.trim() ? "整理完成" : processingStatus;

  const getWorker = useCallback(async () => {
    if (!workerRef.current) {
      workerRef.current = createWorker(OCR_LANG, 1, {
        logger: (message) => {
          const pageId = activePageIdRef.current;
          if (!pageId || typeof message.progress !== "number") return;
          queuePageProgressUpdate(pageId, message.progress);
        },
      });
    }
    return workerRef.current;
  }, [queuePageProgressUpdate]);

  const saveHistorySnapshot = useCallback((content: string, stylePresetId: OcrStylePresetId, sourcePages = pagesRef.current) => {
    if (!content.trim()) return;
    const nextEntry: HistoryEntry = {
      id: createHistoryId(),
      title: buildHistoryTitle(content, sourcePages),
      savedAt: new Date().toISOString(),
      content,
      pageCount: sourcePages.length,
      stylePresetId,
    };
    setHistoryEntries((currentEntries) => [nextEntry, ...currentEntries].slice(0, 24));
  }, []);

  const requestAiPolish = useCallback(async (sourceText: string, stylePresetId: OcrStylePresetId): Promise<{ content: string; usage?: { totalTokens?: number } }> => {
    const response = await fetch("/api/ocr/structure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: sourceText, style: stylePresetId }),
    });
    const payload = (await response.json()) as { content?: string; usage?: { totalTokens?: number }; error?: string };
    if (!response.ok || !payload.content) throw new Error(payload.error || "AI 整理失败。");
    return { content: payload.content, usage: payload.usage };
  }, []);

  const handleMovePage = useCallback((pageId: string, direction: "up" | "down") => {
    if (isProcessing) return;
    setPages((currentPages) => {
      const currentIndex = currentPages.findIndex((page) => page.id === pageId);
      if (currentIndex === -1) return currentPages;
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= currentPages.length) return currentPages;
      const nextPages = [...currentPages];
      const [page] = nextPages.splice(currentIndex, 1);
      nextPages.splice(targetIndex, 0, page);
      return normalizePageOrder(nextPages);
    });
  }, [isProcessing]);

  const handleRemovePage = useCallback((pageId: string) => {
    if (isProcessing) return;
    setPages((currentPages) => {
      const target = currentPages.find((page) => page.id === pageId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const nextPages = normalizePageOrder(currentPages.filter((page) => page.id !== pageId));
      setSelectedPageId((currentSelectedPageId) => (currentSelectedPageId === pageId ? nextPages[0]?.id ?? null : currentSelectedPageId));
      return nextPages;
    });
  }, [isProcessing]);

  const handleClearPages = useCallback(() => {
    if (isProcessing) return;
    pages.forEach((page) => URL.revokeObjectURL(page.previewUrl));
    setPages([]);
    setSelectedPageId(null);
    setProcessingPageId(null);
    setProcessingStatus("等待开始");
    setResultText("");
    setDeepseekUsageLabel(null);
    setActiveTab("structured");
  }, [isProcessing, pages]);

  const handleStartOcr = useCallback(async () => {
    if (!pages.length || isProcessing) return;
    const taskToken = taskTokenRef.current + 1;
    taskTokenRef.current = taskToken;
    const isTaskCurrent = () => taskTokenRef.current === taskToken;

    const resetPages = normalizePageOrder(
      pagesRef.current.map((page) => ({
        ...page,
        status: "idle" as const,
        progress: 0,
        extractedText: "",
        errorMessage: undefined,
        warning: undefined,
      }))
    );

    setIsProcessing(true);
    setProcessingStatus("正在准备任务");
    setDeepseekUsageLabel(null);
    setActiveTab("structured");
    pagesRef.current = resetPages;
    setPages(resetPages);

    try {
      const worker = await getWorker();
      if (!isTaskCurrent()) return;
      const processedPages = [...resetPages];

      for (let index = 0; index < processedPages.length; index += 1) {
        if (!isTaskCurrent()) return;
        const page = processedPages[index];
        activePageIdRef.current = page.id;
        setProcessingPageId(page.id);
        setSelectedPageId(page.id);
        setProcessingStatus(`正在识别第 ${page.order} 页`);
        processedPages[index] = { ...processedPages[index], status: "ocr_processing", progress: 0 };
        pagesRef.current = [...processedPages];
        setPages([...processedPages]);

        try {
          const result = await worker.recognize(page.previewUrl);
          if (!isTaskCurrent()) return;
          const cleanedText = result.data.text
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .join("\n");
          processedPages[index] = {
            ...processedPages[index],
            status: "ocr_done",
            progress: 1,
            extractedText: cleanedText,
            warning: "首次识别会下载中英文语料，后续速度会明显更快。",
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "当前页识别失败。";
          processedPages[index] = { ...processedPages[index], status: "error", errorMessage: message };
        }

        pagesRef.current = [...processedPages];
        setPages([...processedPages]);
      }

      const rawContent = buildRawDocumentText(processedPages, settingsRef.current.preservePageDivider);
      if (!isTaskCurrent()) return;
      if (!rawContent.trim()) {
        setProcessingPageId(null);
        setProcessingStatus("识别完成，但还没有可整理的文本。");
        return;
      }

      setProcessingPageId(null);
      setProcessingStatus("正在整理整篇文档：发送 DeepSeek 请求");
      const structuringPages = processedPages.map((page) =>
        page.status === "ocr_done" || page.status === "done" ? { ...page, status: "structuring" as const } : page
      );
      pagesRef.current = structuringPages;
      setPages(structuringPages);

      const polished = await requestAiPolish(rawContent, settingsRef.current.stylePresetId);
      if (!isTaskCurrent()) return;
      setResultText(polished.content);
      setDeepseekUsageLabel(formatUsageLabel(polished.usage?.totalTokens));
      setProcessingStatus("整理完成");

      const completedPages = structuringPages.map((page) =>
        page.extractedText.trim() ? { ...page, status: "done" as const, progress: 1 } : page
      );
      pagesRef.current = completedPages;
      setPages(completedPages);

      if (settingsRef.current.autoSaveHistory) {
        saveHistorySnapshot(polished.content, settingsRef.current.stylePresetId, completedPages);
      }
    } catch (error) {
      if (isTaskCurrent()) {
        setProcessingStatus(error instanceof Error ? error.message : "OCR 处理失败。");
      }
    } finally {
      if (isTaskCurrent()) {
        activePageIdRef.current = null;
        setProcessingPageId(null);
        setIsProcessing(false);
      }
    }
  }, [getWorker, isProcessing, pages.length, requestAiPolish, saveHistorySnapshot]);

  const handleRestructure = useCallback(async () => {
    if (!resultText.trim() || isProcessing || isRestructuring) return;
    const taskToken = taskTokenRef.current + 1;
    taskTokenRef.current = taskToken;
    const isTaskCurrent = () => taskTokenRef.current === taskToken;
    setIsRestructuring(true);
    setProcessingStatus("正在重新整理全文");
    try {
      const polished = await requestAiPolish(resultText, settings.stylePresetId);
      if (!isTaskCurrent()) return;
      setResultText(polished.content);
      setDeepseekUsageLabel(formatUsageLabel(polished.usage?.totalTokens));
      setProcessingStatus("重新整理完成");
      if (settings.autoSaveHistory) saveHistorySnapshot(polished.content, settings.stylePresetId);
    } catch (error) {
      if (isTaskCurrent()) {
        setProcessingStatus(error instanceof Error ? error.message : "重新整理失败。");
      }
    } finally {
      if (isTaskCurrent()) {
        setIsRestructuring(false);
      }
    }
  }, [isProcessing, isRestructuring, requestAiPolish, resultText, saveHistorySnapshot, settings.autoSaveHistory, settings.stylePresetId]);

  const handleCopy = useCallback(async () => {
    if (!resultText.trim()) return;
    try {
      await navigator.clipboard.writeText(resultText);
      setCopyToastVisible(true);
    } catch {
      window.alert("复制失败，请手动选择文本复制。");
    }
  }, [resultText]);

  useEffect(() => {
    if (!copyToastVisible) return;
    const timer = window.setTimeout(() => setCopyToastVisible(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copyToastVisible]);

  const handleExport = useCallback(async () => {
    if (!resultText.trim()) return;
    const blob = await Packer.toBlob(buildWordDocument(resultText, settings.stylePresetId));
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${buildHistoryTitle(resultText, pagesRef.current)}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  }, [resultText, settings.stylePresetId]);

  const handleRestoreHistory = useCallback((entryId: string) => {
    const targetEntry = historyEntries.find((entry) => entry.id === entryId);
    if (!targetEntry) return;
    setResultText(targetEntry.content);
    setDeepseekUsageLabel(null);
    setProcessingStatus(`已恢复历史记录：${targetEntry.title}`);
    const nextSettings = { ...settingsRef.current, stylePresetId: targetEntry.stylePresetId };
    persistSettings(nextSettings);
    setHistoryOpen(false);
  }, [historyEntries, persistSettings]);

  const handleDeleteHistory = useCallback((entryId: string) => {
    setHistoryEntries((currentEntries) => currentEntries.filter((entry) => entry.id !== entryId));
  }, []);

  const pageCountLabel = pages.length ? `${pages.length} 页` : "等待导入";
  const processingProgress = processingPageId
    ? pages.find((page) => page.id === processingPageId)?.progress ?? 0
    : finishedCount && pages.length
      ? finishedCount / pages.length
      : 0;

  return (
    <section className="ocr-layout-shell">
      <header className="toolbar">
        <div className="toolbar-main">
          <div>
            <p className="eyebrow">OCR Layout Assistant</p>
            <h1>OCR 排版助手</h1>
          </div>
          <div className="toolbar-actions">
            <button className="toolbar-chip" type="button" onClick={() => setHistoryOpen(true)}>
              历史记录 {historyEntries.length} 条
            </button>
            <button className="toolbar-chip" type="button" onClick={() => setIsSettingsOpen(true)} aria-label="打开站点设置" title="打开站点设置">
              <Settings2 className="h-4 w-4" />
            </button>
            {onClose ? (
              <button
                className="toolbar-chip"
                type="button"
                onClick={onClose}
                aria-label="关闭并返回首页"
                title="关闭并返回首页"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <input
        ref={fileInputRef}
        accept="image/*"
        className="sr-only"
        multiple
        type="file"
        onChange={(event) => {
          if (event.target.files) {
            handleFilesAdded(event.target.files);
            event.target.value = "";
          }
        }}
      />

      <main className="workspace">
        <aside className="panel panel-list">
          <div
            className={`dropzone${isDragOver ? " dropzone-active" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!isProcessing) setIsDragOver(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!isProcessing) {
                event.dataTransfer.dropEffect = "copy";
                setIsDragOver(true);
              }
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const nextTarget = event.relatedTarget as Node | null;
              if (!nextTarget || !event.currentTarget.contains(nextTarget)) setIsDragOver(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsDragOver(false);
              if (!isProcessing && event.dataTransfer.files?.length) handleFilesAdded(event.dataTransfer.files);
            }}
          >
            <p className="dropzone-title">导入扫描件</p>
            <p className="dropzone-copy">支持手机拍照、扫描件和截图。你也可以直接拖进来，或者粘贴剪贴板里的图片。</p>
            <div className="dropzone-badges">
              <span className="dropzone-badge">支持拖拽</span>
              <span className="dropzone-badge">支持粘贴截图</span>
              <span className="dropzone-badge">支持逐页排序</span>
            </div>
          </div>

          <section className="scan-controls scan-controls-card">
            <div className="scan-controls-toolbar">
              <button className="secondary-button scan-compact-button" type="button" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                导入图片
              </button>
              <button className="secondary-button scan-compact-button" type="button" onClick={handleClearPages} disabled={pages.length === 0 || isProcessing}>
                清空当前
              </button>
              <button className="primary-button scan-compact-button" type="button" onClick={handleStartOcr} disabled={pages.length === 0 || isProcessing}>
                {isProcessing ? "识别中" : "开始识别"}
              </button>
            </div>
            <p className="scan-controls-hint">识别会一口气完成 OCR 和 DeepSeek 整理，按钮顺序和节奏保持原工作台的使用方式。</p>
            {!isProcessing && statusLabel !== "等待开始" && statusLabel !== "整理完成" && statusLabel !== "重新整理完成" ? (
              <div className="mt-3 rounded-[16px] border border-[#e4b8ab] bg-[#fff4ef] px-4 py-3 text-sm leading-7 text-[#7b4a3a]">
                <strong className="block text-[#553127]">OCR / DeepSeek 诊断</strong>
                <span>{statusLabel}</span>
              </div>
            ) : null}
          </section>

          <section className="image-list image-list-section">
            <div className="section-heading">
              <h2>页面列表</h2>
              <span>{pageCountLabel}</span>
            </div>

            {pages.length === 0 ? (
              <div className="empty-state empty-state-pages">
                <strong>还没有图片</strong>
                <span>把手机拍照或扫描件拖进来后，这里会生成页面清单。</span>
                <div className="empty-state-hints">
                  <span>支持手动排序</span>
                  <span>支持逐页校对</span>
                </div>
              </div>
            ) : (
              <div className="image-cards">
                {pages.map((page, index) => {
                  const isSelected = page.id === currentPage?.id;
                  const isProcessingPage = page.id === processingPageId;
                  const progress = Math.round(page.progress * 100);

                  return (
                    <article
                      className={`image-card${isSelected ? " image-card-selected" : ""}${isProcessingPage ? " image-card-processing" : ""}`}
                      key={page.id}
                      onClick={() => {
                        if (!isProcessing) setSelectedPageId(page.id);
                      }}
                    >
                      <div className="image-card-thumb" aria-hidden="true">
                        {page.order.toString().padStart(2, "0")}
                      </div>
                      <div className="image-card-main">
                        <div className="image-card-meta">
                          <strong title={page.fileName}>{compactFileName(page.fileName)}</strong>
                          <span className={`image-card-status ${pageStatusClass(page)}`}>{formatPageStatus(page)}</span>
                        </div>
                        {shouldShowProgress(page) ? (
                          <div className="image-card-progress-block">
                            <div className="image-card-progress-head">
                              <span>识别进度</span>
                              <strong>{progress}%</strong>
                            </div>
                            <div className="image-card-progress-bar">
                              <div className="image-card-progress-fill" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        ) : null}
                        <div className="image-card-actions-row">
                          <button
                            className="icon-button image-card-action"
                            type="button"
                            disabled={isProcessing || index === 0}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleMovePage(page.id, "up");
                            }}
                          >
                            上移
                          </button>
                          <button
                            className="icon-button image-card-action"
                            type="button"
                            disabled={isProcessing || index === pages.length - 1}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleMovePage(page.id, "down");
                            }}
                          >
                            下移
                          </button>
                          <button
                            className="icon-button icon-button-danger image-card-action"
                            type="button"
                            disabled={isProcessing}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRemovePage(page.id);
                            }}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </aside>

        <section className="panel panel-preview">
          <section className="preview-panel preview-panel-section">
            <div className="section-heading section-heading-preview">
              <h2>当前页预览</h2>
              <span>{currentPage ? `第 ${currentPage.order} 页` : "等待导入"}</span>
            </div>
            <div className={`preview-canvas${currentPage ? " preview-canvas-active" : " preview-canvas-empty"}`}>
              {currentPage ? (
                <div className="preview-paper preview-paper-image">
                  <Image alt={currentPage.fileName} className="preview-image" src={currentPage.previewUrl} width={960} height={1280} unoptimized />
                </div>
              ) : (
                <div className="preview-empty-card">
                  <strong>扫描件预览区</strong>
                  <p className="muted">导入图片后，这里会显示当前选中的页面，方便你边看原图边校对整理结果。</p>
                </div>
              )}
            </div>
          </section>
        </section>

        <aside className="panel panel-result">
          <section className="result-panel result-panel-shell">
            <div className="result-panel-topbar compact-topbar">
              <div className="result-panel-heading-row compact-heading-row">
                <h2>结果面板</h2>
              </div>
              <div className="result-panel-actions result-panel-actions-compact">
                <button className="secondary-button result-tool-button" type="button" onClick={handleRestructure} disabled={!resultText.trim() || isProcessing || isRestructuring}>
                  {isRestructuring ? "重整中" : "重新整理"}
                </button>
                <button className="secondary-button result-tool-button" type="button" onClick={handleCopy} disabled={!resultText.trim() || isProcessing}>
                  复制全文
                </button>
                <button className="secondary-button result-tool-button" type="button" onClick={handleExport} disabled={!resultText.trim() || isProcessing}>
                  导出 Word
                </button>
              </div>
            </div>

            <div className="result-editor-toolbar compact-editor-toolbar compact-style-toolbar">
              <div className="style-preset-inline compact-style-inline">
                {ocrStylePresets.map((preset) => (
                  <button
                    key={preset.id}
                    className={`style-preset-chip style-preset-chip-compact${preset.id === settings.stylePresetId ? " style-preset-chip-active" : ""}`}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      const nextSettings = { ...settings, stylePresetId: preset.id };
                      persistSettings(nextSettings);
                    }}
                    title={preset.description}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="tab-strip result-tab-strip compact-tab-strip">
              <button className={`tab-button compact-pill${activeTab === "structured" ? " tab-button-active" : ""}`} type="button" onClick={() => setActiveTab("structured")}>
                编辑后
              </button>
              <button className={`tab-button compact-pill${activeTab === "raw" ? " tab-button-active" : ""}`} type="button" onClick={() => setActiveTab("raw")}>
                原版
              </button>
              <span className="result-tab-meta">
                {resultText.trim() ? `${previewBlocks.length} 个内容块 · ${lastSavedLabel}` : isProcessing ? "正在处理中" : "等待识别"}
              </span>
            </div>

            {deepseekUsageLabel ? <p className="result-usage-label">{deepseekUsageLabel}</p> : null}

            {activeTab === "structured" ? (
              <div className="document-view document-view-structured">
                {resultText.trim() ? (
                  <>
                    <section className={`styled-preview-card result-preview-card ${activePreset.previewClassName}`}>
                      <div className="result-preview-header">
                        <div>
                          <div className="result-preview-label">成果预览</div>
                          <div className="result-preview-title">{activePreset.label}</div>
                        </div>
                        <div className="result-preview-stats">
                          <span>{resultText.length} 字符</span>
                          <span>{finishedCount}/{pages.length || 0} 页完成</span>
                        </div>
                      </div>
                      <article className="styled-preview-article">
                        {previewBlocks.map((block, index) => {
                          if (block.kind === "title") return <h3 key={`${block.kind}-${index}`}>{block.text}</h3>;
                          if (block.kind === "heading") return <h4 key={`${block.kind}-${index}`}>{block.text}</h4>;
                          if (block.kind === "subheading") return <h5 key={`${block.kind}-${index}`}>{block.text}</h5>;
                          if (block.kind === "table") {
                            return (
                              <div className="preview-table-block" key={`${block.kind}-${index}`}>
                                <span>表格块</span>
                                <p>{block.text || "表格内容会在 Word 中以独立表格导出。"}</p>
                              </div>
                            );
                          }
                          return <p key={`${block.kind}-${index}`}>{block.text}</p>;
                        })}
                      </article>
                    </section>

                  </>
                ) : (
                  <div className="empty-state empty-state-result empty-state-workbench">
                    <strong>{isProcessing ? "正在整理文稿" : "还没有整理结果"}</strong>
                    <span>{isProcessing ? statusLabel : "开始识别后，这里会出现可编辑正文、原版 OCR，以及预览排版。"}</span>
                    <div className="empty-state-hints">
                      <span>支持编辑后再导出</span>
                      <span>支持局部重整</span>
                      <span>支持 Word 风格导出</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="document-view raw-ocr-view">
                {currentPage ? (
                  <>
                    <div className="result-preview-header raw-preview-header">
                      <div>
                        <div className="result-preview-label">原始识别</div>
                        <div className="result-preview-title">第 {currentPage.order} 页 OCR 文本</div>
                      </div>
                      <div className="result-preview-stats">
                        <span>{currentPage.fileName}</span>
                      </div>
                    </div>
                    {currentPage.warning ? <p className="panel-warning">{currentPage.warning}</p> : null}
                    <pre className="raw-ocr-text">{currentOcrResult || "当前页没有识别到文本。"}</pre>
                  </>
                ) : (
                  <div className="empty-state empty-state-result empty-state-workbench">
                    <strong>{isProcessing ? "正在识别当前页面" : "还没有 OCR 结果"}</strong>
                    <span>{isProcessing ? statusLabel : "导入图片并开始识别后，这里会展示每一页的原始识别内容。"}</span>
                    <div className="empty-state-hints">
                      <span>适合对照校对</span>
                      <span>保留原始 OCR 痕迹</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </aside>
      </main>

      {isProcessing && pages.length ? (
        <div className="scan-progress-card">
          <div className="scan-progress-head">
            <span>{statusLabel}</span>
            <strong>{Math.round(processingProgress * 100)}%</strong>
          </div>
          <div className="scan-progress-bar">
            <div className="scan-progress-fill" style={{ width: `${Math.round(processingProgress * 100)}%` }} />
          </div>
        </div>
      ) : null}

      <HistoryDialog isOpen={historyOpen} entries={historyEntries} onClose={() => setHistoryOpen(false)} onRestore={handleRestoreHistory} onDelete={handleDeleteHistory} />
      {copyToastVisible ? (
        <div className="ocr-copy-toast" role="status" aria-live="polite">
          <Check className="h-4 w-4" />
          已复制全文
        </div>
      ) : null}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </section>
  );
}
