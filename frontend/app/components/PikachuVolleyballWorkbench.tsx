"use client";

import NextImage from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type PikachuVolleyballWorkbenchProps = {
  onClose?: () => void;
};

type ActionKey = "left" | "right" | "up" | "down" | "hit";
type PlayerKey = "p1" | "p2";
type BindingShape = Record<PlayerKey, Record<ActionKey, string>>;
type KeyRouteMap = Record<string, string>;
type BallThemeId = "default" | "theme-1" | "theme-2" | "theme-3" | "theme-4" | "theme-5" | "custom";
type DifficultyId = "low" | "normal" | "high";
type CloudThemeId = "sunny" | "overcast" | "sunset" | "cyber" | "storm";
type CloudFxLevel = "low" | "medium" | "high";
type CloudSettings = {
  themeId: CloudThemeId;
  density: number;
  speed: number;
  size: number;
  opacity: number;
  fxLevel: CloudFxLevel;
  weatherFrequency: number;
  weatherSize: number;
};
type MatchHistoryRecord = {
  id: string;
  createdAt: string;
  p1Score: number;
  p2Score: number;
  winningScore: number;
  difficulty: DifficultyId;
  themeId: BallThemeId;
  themePreviewSrc: string;
  synced?: boolean;
};

type PVWindow = Window & {
  __pv?: {
    game?: {
      view?: {
        game?: {
          ball?: { textures?: unknown[]; gotoAndStop?: (n: number) => void };
          ballHyper?: { texture?: unknown };
          ballTrail?: { texture?: unknown };
          punch?: { texture?: unknown };
        };
      };
      physics?: {
        ball?: { x: number; y: number };
        player1?: {
          isComputer?: boolean;
          computerBoldness?: number;
          initializeForNewRound?: (...args: unknown[]) => void;
        };
        player2?: {
          isComputer?: boolean;
          computerBoldness?: number;
          initializeForNewRound?: (...args: unknown[]) => void;
        };
      };
    };
    resources?: Record<string, { textures?: Record<string, unknown> }>;
  };
  PIXI?: {
    Texture?: { from: (source: HTMLCanvasElement) => unknown };
    sound?: { volumeAll?: number };
  };
  __hostBallOverlayRaf?: number;
  __hostMatchWatchTimer?: number;
  __hostMatchCaptured?: boolean;
  __hostCloudTuneTimer?: number;
  __hostWeatherRaf?: number;
  __hostCloudTextureCache?: Record<string, unknown>;
};

const LOCAL_FULL_REMAKE_URL = "/pikachu-volley-full/zh/index.html";
const BINDINGS_STORAGE_KEY = "pikachu-volley-keybindings-v1";
const BALL_THEME_STORAGE_KEY = "pikachu-volley-ball-theme-v2";
const BALL_THEME_CUSTOM_STORAGE_KEY = "pikachu-volley-ball-theme-custom-v2";
const DIFFICULTY_STORAGE_KEY = "pikachu-volley-difficulty-v1";
const PIKACHU_MATCH_HISTORY_STORAGE_KEY = "pikachu-volley-match-history-v1";
const CLOUD_SETTINGS_STORAGE_KEY = "pikachu-volley-cloud-settings-v2";
const PRESET_THEME_IDS: Array<Exclude<BallThemeId, "default" | "custom">> = [
  "theme-1",
  "theme-2",
  "theme-3",
  "theme-4",
  "theme-5",
];
const THEME_DISPLAY_NAME: Record<BallThemeId, string> = {
  default: "原版球",
  "theme-1": "海洋藍",
  "theme-2": "熾焰紅",
  "theme-3": "森靈綠",
  "theme-4": "黑曜惡魔",
  "theme-5": "星雲紫",
  custom: "自定義",
};
const THEME_PREVIEW_SRC: Record<Exclude<BallThemeId, "custom">, string> = {
  default: "/ball-theme-original.svg",
  "theme-1": "/ball-theme-1.svg",
  "theme-2": "/ball-theme-2.svg",
  "theme-3": "/ball-theme-3.svg",
  "theme-4": "/ball-theme-4.svg",
  "theme-5": "/ball-theme-5.svg",
};
const CLOUD_THEME_LABELS: Record<CloudThemeId, string> = {
  sunny: "晴天雲",
  overcast: "多雲層",
  sunset: "夕照雲",
  cyber: "雪雲",
  storm: "風暴雲",
};
const CLOUD_FX_LABELS: Record<CloudFxLevel, string> = {
  low: "低（柔和自然）",
  medium: "中（動態層次）",
  high: "高（強烈特效）",
};
const DEFAULT_CLOUD_SETTINGS: CloudSettings = {
  themeId: "sunny",
  density: 10,
  speed: 100,
  size: 100,
  opacity: 100,
  fxLevel: "low",
  weatherFrequency: 100,
  weatherSize: 100,
};

function loadCloudSettingsFromStorage(): CloudSettings {
  if (typeof window === "undefined") return DEFAULT_CLOUD_SETTINGS;
  try {
    const raw = window.localStorage.getItem(CLOUD_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_CLOUD_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<CloudSettings>;
    const themeId: CloudThemeId =
      parsed.themeId === "sunny" ||
      parsed.themeId === "overcast" ||
      parsed.themeId === "sunset" ||
      parsed.themeId === "cyber" ||
      parsed.themeId === "storm"
        ? parsed.themeId
        : DEFAULT_CLOUD_SETTINGS.themeId;
    const fxLevel: CloudFxLevel =
      parsed.fxLevel === "low" || parsed.fxLevel === "medium" || parsed.fxLevel === "high"
        ? parsed.fxLevel
        : DEFAULT_CLOUD_SETTINGS.fxLevel;
    return {
      themeId,
      fxLevel,
      density: Number.isFinite(Number(parsed.density)) ? Math.max(4, Math.min(16, Number(parsed.density))) : 10,
      speed: Number.isFinite(Number(parsed.speed)) ? Math.max(40, Math.min(180, Number(parsed.speed))) : 100,
      size: Number.isFinite(Number(parsed.size)) ? Math.max(70, Math.min(160, Number(parsed.size))) : 100,
      opacity: Number.isFinite(Number(parsed.opacity)) ? Math.max(20, Math.min(100, Number(parsed.opacity))) : 100,
      weatherFrequency: Number.isFinite(Number(parsed.weatherFrequency))
        ? Math.max(40, Math.min(180, Number(parsed.weatherFrequency)))
        : 100,
      weatherSize: Number.isFinite(Number(parsed.weatherSize)) ? Math.max(60, Math.min(170, Number(parsed.weatherSize))) : 100,
    };
  } catch {
    return DEFAULT_CLOUD_SETTINGS;
  }
}

function loadMatchHistoryFromStorage(): MatchHistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PIKACHU_MATCH_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MatchHistoryRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.createdAt === "string" &&
        typeof item.p1Score === "number" &&
        typeof item.p2Score === "number" &&
        typeof item.winningScore === "number"
    );
  } catch {
    return [];
  }
}
const DIFFICULTY_LABELS: Record<DifficultyId, string> = {
  low: "最低",
  normal: "默認",
  high: "最高",
};
const DIFFICULTY_BOLDNESS: Record<DifficultyId, number> = {
  low: 0,
  normal: 2,
  high: 4,
};

const DEFAULT_BINDINGS: BindingShape = {
  p1: { left: "KeyA", right: "KeyD", up: "KeyW", down: "KeyS", hit: "Space" },
  p2: {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    hit: "Enter",
  },
};

const ENGINE_TARGET: BindingShape = {
  p1: { left: "KeyD", right: "KeyG", up: "KeyR", down: "KeyV", hit: "KeyZ" },
  p2: {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    hit: "Enter",
  },
};

const ACTION_LABELS: Record<ActionKey, string> = {
  left: "左",
  right: "右",
  up: "上",
  down: "下",
  hit: "击球及扑救",
};

const HUMAN_CODE_LABELS: Record<string, string> = {
  Space: "空白鍵",
  Enter: "Enter",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
};

function codeLabel(code: string) {
  if (HUMAN_CODE_LABELS[code]) return HUMAN_CODE_LABELS[code];
  if (code.startsWith("Key")) return code.replace("Key", "");
  if (code.startsWith("Digit")) return code.replace("Digit", "");
  return code;
}

function loadBindingsFromStorage(): BindingShape {
  if (typeof window === "undefined") return DEFAULT_BINDINGS;
  try {
    const raw = window.localStorage.getItem(BINDINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_BINDINGS;
    const parsed = JSON.parse(raw) as Partial<BindingShape>;
    return {
      p1: { ...DEFAULT_BINDINGS.p1, ...(parsed.p1 || {}) },
      p2: { ...DEFAULT_BINDINGS.p2, ...(parsed.p2 || {}) },
    };
  } catch {
    return DEFAULT_BINDINGS;
  }
}

function loadBallThemeFromStorage(): BallThemeId {
  if (typeof window === "undefined") return "default";
  const raw = window.localStorage.getItem(BALL_THEME_STORAGE_KEY);
  if (raw === "default" || raw === "custom" || PRESET_THEME_IDS.some((theme) => theme === raw)) {
    return raw as BallThemeId;
  }
  return "default";
}

function loadCustomBallFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(BALL_THEME_CUSTOM_STORAGE_KEY);
}

function loadDifficultyFromStorage(): DifficultyId {
  if (typeof window === "undefined") return "normal";
  const raw = window.localStorage.getItem(DIFFICULTY_STORAGE_KEY);
  if (raw === "low" || raw === "normal" || raw === "high") return raw;
  return "normal";
}

function buildKeyRouteMap(bindings: BindingShape): KeyRouteMap {
  const result: KeyRouteMap = {};
  (Object.keys(bindings) as PlayerKey[]).forEach((player) => {
    (Object.keys(bindings[player]) as ActionKey[]).forEach((action) => {
      result[bindings[player][action]] = ENGINE_TARGET[player][action];
    });
  });
  return result;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

function getPresetPalette(themeId: BallThemeId) {
  switch (themeId) {
    case "theme-2":
      return { primary: "#f6f7f8", secondary: "#6ca9ff", accent: "#1a355a" };
    case "theme-3":
      return { primary: "#f1f0d8", secondary: "#6eb057", accent: "#234220" };
    case "theme-4":
      return { primary: "#f7d6be", secondary: "#ee7b4d", accent: "#5d1f12" };
    case "theme-5":
      return { primary: "#d8cef9", secondary: "#8f6df1", accent: "#2b1d4f" };
    default:
      return { primary: "#ffeaa7", secondary: "#ff6b6b", accent: "#3a2b00" };
  }
}

function renderPresetBallCanvas(themeId: BallThemeId, angleDeg: number, variant: "normal" | "hyper" | "trail" | "punch") {
  const size = 40;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const { primary, secondary, accent } = getPresetPalette(themeId);
  const cx = size / 2;
  const cy = size / 2;
  const radius = 18;
  const angle = (Math.PI * angleDeg) / 180;

  ctx.save();
  if (variant === "trail") ctx.globalAlpha = 0.4;
  if (variant === "punch") ctx.globalAlpha = 0.85;
  if (variant === "hyper") {
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 6;
  }

  if (variant === "punch") {
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return canvas;
  }

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = primary;
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = secondary;
  ctx.fillRect(-radius, -radius, radius * 2, radius);
  ctx.restore();

  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
  return canvas;
}

function renderImageBallCanvas(image: HTMLImageElement, angleDeg: number, variant: "normal" | "hyper" | "trail" | "punch") {
  const size = 40;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const cx = size / 2;
  const cy = size / 2;
  const radius = 18;
  const angle = (Math.PI * angleDeg) / 180;

  if (variant === "punch") {
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 6, 0, Math.PI * 2);
    ctx.stroke();
    return canvas;
  }

  if (variant === "trail") ctx.globalAlpha = 0.4;
  if (variant === "hyper") {
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 6;
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const scale = Math.max((radius * 2) / image.width, (radius * 2) / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  return canvas;
}

function buildCroppedCircleDataUrl(
  source: HTMLImageElement,
  zoom: number,
  offsetX: number,
  offsetY: number,
  previewSize = 240,
  outputSize = 256
) {
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const baseScale = Math.max(previewSize / source.width, previewSize / source.height);
  const outScale = baseScale * zoom * (outputSize / previewSize);
  const centerX = outputSize / 2 + offsetX * (outputSize / previewSize);
  const centerY = outputSize / 2 + offsetY * (outputSize / previewSize);
  const drawW = source.width * outScale;
  const drawH = source.height * outScale;

  ctx.clearRect(0, 0, outputSize, outputSize);
  ctx.save();
  ctx.beginPath();
  ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2 - 4, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(source, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
  ctx.restore();

  return canvas.toDataURL("image/png");
}

function getThemeVisualScale(themeId: BallThemeId): number {
  switch (themeId) {
    case "theme-2":
      return 1.08;
    case "theme-3":
      return 0.96;
    case "theme-4":
      return 1.12;
    case "theme-5":
      return 1.04;
    default:
      return 1;
  }
}

function getThemeOverlaySource(themeId: BallThemeId, customBallDataUrl: string | null): string {
  if (themeId === "default") return "";
  if (themeId === "custom" && customBallDataUrl) return customBallDataUrl;
  return THEME_PREVIEW_SRC[themeId as Exclude<BallThemeId, "custom">] || THEME_PREVIEW_SRC["theme-1"];
}

function renderCloudThemeCanvas(themeId: CloudThemeId, fxLevel: CloudFxLevel) {
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 24;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const palette = (() => {
    switch (themeId) {
      case "overcast":
        return { base: "#c5ccd6", shade: "#8893a1", accent: "#edf2f8" };
      case "sunset":
        return { base: "#ffc08c", shade: "#f08a7a", accent: "#ffe2bf" };
      case "cyber":
        return { base: "#eef6ff", shade: "#9cb2ce", accent: "#ffffff" };
      case "storm":
        return { base: "#aab4c7", shade: "#4e5669", accent: "#d8ddea" };
      default:
        return { base: "#dbe3ef", shade: "#9eabbf", accent: "#f6fbff" };
    }
  })();

  ctx.clearRect(0, 0, 48, 24);
  ctx.fillStyle = palette.shade;
  ctx.beginPath();
  ctx.ellipse(15, 14, 11, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(24, 11, 12, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(35, 14, 10, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.base;
  ctx.beginPath();
  ctx.ellipse(14, 12.5, 10, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(23, 10.2, 11.5, 7.2, 0, 0, Math.PI * 2);
  ctx.ellipse(34, 12.3, 9.5, 5.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.accent;
  ctx.globalAlpha = fxLevel === "high" ? 0.45 : 0.28;
  ctx.beginPath();
  ctx.ellipse(23, 8.5, 8, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (themeId === "cyber") {
    ctx.fillStyle = fxLevel === "high" ? "rgba(255,255,255,0.95)" : "rgba(245,251,255,0.88)";
    for (let i = 0; i < 8; i += 1) {
      const x = 10 + Math.floor(Math.random() * 28);
      const y = 8 + Math.floor(Math.random() * 10);
      const s = fxLevel === "high" ? 1.8 : 1.3;
      ctx.fillRect(x, y, s, s);
    }
  }
  if (themeId === "storm" && fxLevel !== "low") {
    ctx.strokeStyle = fxLevel === "high" ? "#f7fbff" : "#dde6f5";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(24, 10);
    ctx.lineTo(20, 16);
    ctx.lineTo(25, 16);
    ctx.lineTo(21, 21);
    ctx.stroke();
  }
  return canvas;
}

export function PikachuVolleyballWorkbench({ onClose }: PikachuVolleyballWorkbenchProps) {
  const [mobileCheckDone, setMobileCheckDone] = useState(false);
  const [isMobileLike, setIsMobileLike] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [frameHeight, setFrameHeight] = useState(700);
  const [remapOpen, setRemapOpen] = useState(false);
  const [themeEditorOpen, setThemeEditorOpen] = useState(false);
  const [backgroundEditorOpen, setBackgroundEditorOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [captureTarget, setCaptureTarget] = useState<{ player: PlayerKey; action: ActionKey } | null>(null);
  const [bindings, setBindings] = useState<BindingShape>(loadBindingsFromStorage);
  const [selectedBallTheme, setSelectedBallTheme] = useState<BallThemeId>(loadBallThemeFromStorage);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyId>(loadDifficultyFromStorage);
  const [cloudSettings, setCloudSettings] = useState<CloudSettings>(loadCloudSettingsFromStorage);
  const [customBallDataUrl, setCustomBallDataUrl] = useState<string | null>(loadCustomBallFromStorage);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryRecord[]>(loadMatchHistoryFromStorage);
  const [editingImageDataUrl, setEditingImageDataUrl] = useState<string | null>(null);
  const [editOffsetX, setEditOffsetX] = useState(0);
  const [editOffsetY, setEditOffsetY] = useState(0);
  const [editZoom, setEditZoom] = useState(1);
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const keyRouteMapRef = useRef<KeyRouteMap>(buildKeyRouteMap(DEFAULT_BINDINGS));
  const selectedBallThemeRef = useRef<BallThemeId>(selectedBallTheme);
  const selectedDifficultyRef = useRef<DifficultyId>(selectedDifficulty);
  const cloudSettingsRef = useRef<CloudSettings>(cloudSettings);
  const customBallDataUrlRef = useRef<string | null>(customBallDataUrl);
  const dragStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const ua = window.navigator.userAgent || "";
    const mobileByUa = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|Windows Phone/i.test(ua);
    const mobileByViewport = window.innerWidth <= 900;
    setIsMobileLike(mobileByUa || mobileByViewport);
    setMobileCheckDone(true);
  }, []);

  useEffect(() => {
    keyRouteMapRef.current = buildKeyRouteMap(bindings);
    try {
      window.localStorage.setItem(BINDINGS_STORAGE_KEY, JSON.stringify(bindings));
    } catch {
      // ignore storage write errors
    }
  }, [bindings]);

  useEffect(() => {
    selectedBallThemeRef.current = selectedBallTheme;
    try {
      window.localStorage.setItem(BALL_THEME_STORAGE_KEY, selectedBallTheme);
      if (customBallDataUrl) {
        window.localStorage.setItem(BALL_THEME_CUSTOM_STORAGE_KEY, customBallDataUrl);
      } else {
        window.localStorage.removeItem(BALL_THEME_CUSTOM_STORAGE_KEY);
      }
    } catch {
      // ignore storage write errors
    }
  }, [selectedBallTheme, customBallDataUrl]);

  useEffect(() => {
    customBallDataUrlRef.current = customBallDataUrl;
  }, [customBallDataUrl]);

  useEffect(() => {
    selectedDifficultyRef.current = selectedDifficulty;
    try {
      window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, selectedDifficulty);
    } catch {
      // ignore storage write errors
    }
  }, [selectedDifficulty]);

  useEffect(() => {
    cloudSettingsRef.current = cloudSettings;
    try {
      window.localStorage.setItem(CLOUD_SETTINGS_STORAGE_KEY, JSON.stringify(cloudSettings));
    } catch {
      // ignore storage write errors
    }
  }, [cloudSettings]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PIKACHU_MATCH_HISTORY_STORAGE_KEY, JSON.stringify(matchHistory.slice(0, 50)));
    } catch {
      // ignore storage write errors
    }
  }, [matchHistory]);

  useEffect(() => {
    if (!captureTarget) return;
    const listener = (event: KeyboardEvent) => {
      event.preventDefault();
      const { player, action } = captureTarget;
      setBindings((prev) => ({
        ...prev,
        [player]: {
          ...prev[player],
          [action]: event.code,
        },
      }));
      setCaptureTarget(null);
    };
    window.addEventListener("keydown", listener, { capture: true });
    return () => window.removeEventListener("keydown", listener, { capture: true });
  }, [captureTarget]);

  useEffect(() => {
    if (!isDraggingPreview) return;
    const move = (event: MouseEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      setEditOffsetX(start.ox + (event.clientX - start.x));
      setEditOffsetY(start.oy + (event.clientY - start.y));
    };
    const up = () => {
      setIsDraggingPreview(false);
      dragStartRef.current = null;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [isDraggingPreview]);

  useEffect(() => {
    if (!editingImageDataUrl) return;
    const timer = window.setTimeout(async () => {
      try {
        const source = await loadImage(editingImageDataUrl);
        const dataUrl = buildCroppedCircleDataUrl(source, editZoom, editOffsetX, editOffsetY);
        if (!dataUrl) return;
        setCustomBallDataUrl(dataUrl);
      } catch {
        // ignore
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [editingImageDataUrl, editOffsetX, editOffsetY, editZoom]);

  const themePreviewForRecord = useCallback((themeId: BallThemeId) => {
    if (themeId === "custom") return customBallDataUrlRef.current || THEME_PREVIEW_SRC.default;
    return THEME_PREVIEW_SRC[themeId as Exclude<BallThemeId, "custom">] || THEME_PREVIEW_SRC.default;
  }, []);

  const persistHistoryRecord = useCallback((record: MatchHistoryRecord) => {
    setMatchHistory((prev) => {
      const merged = [record, ...prev.filter((item) => item.id !== record.id)];
      return merged.slice(0, 50);
    });
  }, []);

  const syncHistoryRecordIfLoggedIn = useCallback(async (record: MatchHistoryRecord) => {
    try {
      const meRes = await fetch("/api/auth/me", { method: "GET", cache: "no-store" });
      if (!meRes.ok) return;
      const meData = (await meRes.json()) as { authenticated?: boolean };
      if (!meData?.authenticated) return;

      const res = await fetch("/api/pikachu-volleyball/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p1Score: record.p1Score,
          p2Score: record.p2Score,
          winningScore: record.winningScore,
          difficulty: record.difficulty,
          themeId: record.themeId,
          themePreviewSrc: record.themePreviewSrc,
          metadata: { createdAt: record.createdAt },
        }),
      });
      if (!res.ok) return;
      setMatchHistory((prev) =>
        prev.map((item) => (item.id === record.id ? { ...item, synced: true } : item))
      );
    } catch {
      // ignore sync failures
    }
  }, []);

  const pullRemoteHistoryIfLoggedIn = useCallback(async () => {
    try {
      const meRes = await fetch("/api/auth/me", { method: "GET", cache: "no-store" });
      if (!meRes.ok) return;
      const meData = (await meRes.json()) as { authenticated?: boolean };
      if (!meData?.authenticated) return;
      const res = await fetch("/api/pikachu-volleyball/scores", { method: "GET", cache: "no-store" });
      if (!res.ok) return;
      const payload = (await res.json()) as { history?: MatchHistoryRecord[] };
      const remoteList = Array.isArray(payload.history) ? payload.history : [];
      if (remoteList.length === 0) return;
      setMatchHistory((prev) => {
        const map = new Map<string, MatchHistoryRecord>();
        [...remoteList, ...prev].forEach((item) => {
          map.set(item.id, { ...item, synced: true });
        });
        return Array.from(map.values())
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
          .slice(0, 50);
      });
    } catch {
      // ignore load failures
    }
  }, []);

  useEffect(() => {
    void pullRemoteHistoryIfLoggedIn();
  }, [pullRemoteHistoryIfLoggedIn]);

  useEffect(() => {
    if (!historyOpen) return;
    void pullRemoteHistoryIfLoggedIn();
  }, [historyOpen, pullRemoteHistoryIfLoggedIn]);

  const applyBallThemeToRuntime = useCallback(
    async (themeId: BallThemeId) => {
      const iframe = iframeRef.current;
      const win = iframe?.contentWindow as PVWindow | undefined;
      const doc = iframe?.contentDocument;
      if (!win) return;
      if (!doc) return;

      const runtime = win.__pv;
      const gameView = runtime?.game?.view?.game;
      const physicsBall = runtime?.game?.physics?.ball as { x: number; y: number } | undefined;
      if (!runtime || !gameView?.ball || !physicsBall) return;

      const container = doc.getElementById("game-canvas-container") as HTMLElement | null;
      const canvas = doc.getElementById("game-canvas") as HTMLCanvasElement | null;
      if (!container || !canvas) return;
      if (getComputedStyle(container).position === "static") {
        container.style.position = "relative";
      }

      const hideOverlayNodes = () => {
        const ids = ["host-ball-overlay", "host-ball-overlay-trail-1", "host-ball-overlay-trail-2"];
        ids.forEach((id) => {
          const node = doc.getElementById(id) as HTMLElement | null;
          if (node) node.style.display = "none";
        });
      };

      const liveGameView = win.__pv?.game?.view?.game as
        | {
            shadows?: { forBall?: { visible?: boolean; alpha?: number; renderable?: boolean } };
            [key: string]: unknown;
          }
        | undefined;
      const setOriginalBallVisible = (visible: boolean) => {
        if (!liveGameView) return;
        for (const [key, value] of Object.entries(liveGameView)) {
          if (!key.toLowerCase().includes("ball")) continue;
          if (!value || typeof value !== "object") continue;
          const spriteLike = value as { visible?: boolean; alpha?: number; renderable?: boolean };
          spriteLike.visible = visible;
          spriteLike.alpha = visible ? 1 : 0;
          spriteLike.renderable = visible;
        }
        const ballShadow = liveGameView.shadows?.forBall as
          | { visible?: boolean; alpha?: number; renderable?: boolean }
          | undefined;
        if (ballShadow) {
          ballShadow.visible = visible;
          ballShadow.alpha = visible ? 1 : 0;
          ballShadow.renderable = visible;
        }
      };

      if (themeId === "default") {
        if (typeof win.__hostBallOverlayRaf === "number") {
          win.cancelAnimationFrame(win.__hostBallOverlayRaf);
          win.__hostBallOverlayRaf = undefined;
        }
        hideOverlayNodes();
        setOriginalBallVisible(true);
        return;
      }

      setOriginalBallVisible(false);

      let overlay = doc.getElementById("host-ball-overlay") as HTMLImageElement | null;
      if (!overlay) {
        overlay = doc.createElement("img");
        overlay.id = "host-ball-overlay";
        overlay.alt = "ball-overlay";
        overlay.style.position = "absolute";
        overlay.style.left = "0";
        overlay.style.top = "0";
        overlay.style.transform = "translate(-50%, -50%)";
        overlay.style.pointerEvents = "none";
        overlay.style.zIndex = "7";
        overlay.style.imageRendering = "pixelated";
        overlay.style.borderRadius = "50%";
        container.appendChild(overlay);
      }
      let overlayTrail1 = doc.getElementById("host-ball-overlay-trail-1") as HTMLImageElement | null;
      if (!overlayTrail1) {
        overlayTrail1 = doc.createElement("img");
        overlayTrail1.id = "host-ball-overlay-trail-1";
        overlayTrail1.alt = "ball-overlay-trail-1";
        overlayTrail1.style.position = "absolute";
        overlayTrail1.style.left = "0";
        overlayTrail1.style.top = "0";
        overlayTrail1.style.transform = "translate(-50%, -50%)";
        overlayTrail1.style.pointerEvents = "none";
        overlayTrail1.style.zIndex = "6";
        overlayTrail1.style.opacity = "0.36";
        overlayTrail1.style.imageRendering = "pixelated";
        overlayTrail1.style.borderRadius = "50%";
        container.appendChild(overlayTrail1);
      }
      let overlayTrail2 = doc.getElementById("host-ball-overlay-trail-2") as HTMLImageElement | null;
      if (!overlayTrail2) {
        overlayTrail2 = doc.createElement("img");
        overlayTrail2.id = "host-ball-overlay-trail-2";
        overlayTrail2.alt = "ball-overlay-trail-2";
        overlayTrail2.style.position = "absolute";
        overlayTrail2.style.left = "0";
        overlayTrail2.style.top = "0";
        overlayTrail2.style.transform = "translate(-50%, -50%)";
        overlayTrail2.style.pointerEvents = "none";
        overlayTrail2.style.zIndex = "5";
        overlayTrail2.style.opacity = "0.2";
        overlayTrail2.style.imageRendering = "pixelated";
        overlayTrail2.style.borderRadius = "50%";
        container.appendChild(overlayTrail2);
      }
      const overlaySrc = getThemeOverlaySource(themeId, customBallDataUrl);
      overlay.src = overlaySrc;
      overlayTrail1.src = overlaySrc;
      overlayTrail2.src = overlaySrc;

      const themeScale = getThemeVisualScale(themeId);
      const trailHistory: Array<{ x: number; y: number; angleDeg: number }> = [];
      let prevX = physicsBall.x;
      let prevY = physicsBall.y;
      let angleDeg = 0;
      const draw = () => {
        const ball = (win.__pv?.game?.physics?.ball || physicsBall) as { x: number; y: number };
        const frameGameView = win.__pv?.game?.view?.game as
          | {
              container?: { visible?: boolean };
              ball?: { visible?: boolean };
              ballHyper?: { visible?: boolean };
              ballTrail?: { visible?: boolean };
              shadows?: {
                forBall?: { visible?: boolean; alpha?: number; renderable?: boolean };
                [key: string]: unknown;
              };
              [key: string]: unknown;
            }
          | undefined;
        const inGameScene = Boolean(frameGameView?.container?.visible);
        if (!inGameScene) {
          overlay!.style.display = "none";
          overlayTrail1!.style.display = "none";
          overlayTrail2!.style.display = "none";
          trailHistory.length = 0;
          prevX = ball.x;
          prevY = ball.y;
          win.__hostBallOverlayRaf = win.requestAnimationFrame(draw);
          return;
        }
        overlay!.style.display = "block";
        overlayTrail1!.style.display = "block";
        overlayTrail2!.style.display = "block";

        // Keep original ball artifacts hidden every frame.
        if (frameGameView) {
          for (const [key, value] of Object.entries(frameGameView)) {
            if (!key.toLowerCase().includes("ball")) continue;
            if (!value || typeof value !== "object") continue;
            const spriteLike = value as { visible?: boolean; alpha?: number; renderable?: boolean };
            spriteLike.visible = false;
            spriteLike.alpha = 0;
            spriteLike.renderable = false;
          }
          const ballShadow = frameGameView.shadows?.forBall as
            | { visible?: boolean; alpha?: number; renderable?: boolean }
            | undefined;
          if (ballShadow) {
            ballShadow.visible = false;
            ballShadow.alpha = 0;
            ballShadow.renderable = false;
          }
        }

        const sx = canvas.clientWidth / 432;
        const sy = canvas.clientHeight / 304;
        const size = Math.max(14, 40 * sx * themeScale);
        overlay!.style.width = `${size}px`;
        overlay!.style.height = `${size}px`;
        overlay!.style.left = `${ball.x * sx}px`;
        overlay!.style.top = `${ball.y * sy}px`;
        const dx = ball.x - prevX;
        const dy = ball.y - prevY;
        const speed = Math.hypot(dx, dy);
        if (speed > 0.001) {
          angleDeg += dx * 9 + dy * 1.8;
          if (angleDeg > 36000 || angleDeg < -36000) angleDeg %= 360;
        }
        prevX = ball.x;
        prevY = ball.y;
        overlay!.style.transform = `translate(-50%, -50%) rotate(${angleDeg.toFixed(2)}deg)`;

        trailHistory.push({ x: ball.x, y: ball.y, angleDeg });
        if (trailHistory.length > 12) trailHistory.shift();
        const t1 = trailHistory[Math.max(0, trailHistory.length - 4)];
        const t2 = trailHistory[Math.max(0, trailHistory.length - 8)];
        overlayTrail1!.style.width = `${size}px`;
        overlayTrail1!.style.height = `${size}px`;
        overlayTrail1!.style.left = `${t1.x * sx}px`;
        overlayTrail1!.style.top = `${t1.y * sy}px`;
        overlayTrail1!.style.transform = `translate(-50%, -50%) rotate(${t1.angleDeg.toFixed(2)}deg)`;
        overlayTrail2!.style.width = `${size}px`;
        overlayTrail2!.style.height = `${size}px`;
        overlayTrail2!.style.left = `${t2.x * sx}px`;
        overlayTrail2!.style.top = `${t2.y * sy}px`;
        overlayTrail2!.style.transform = `translate(-50%, -50%) rotate(${t2.angleDeg.toFixed(2)}deg)`;
        win.__hostBallOverlayRaf = win.requestAnimationFrame(draw);
      };

      if (typeof win.__hostBallOverlayRaf === "number") {
        win.cancelAnimationFrame(win.__hostBallOverlayRaf);
      }
      win.__hostBallOverlayRaf = win.requestAnimationFrame(draw);
    },
    [customBallDataUrl]
  );

  const applyCloudThemeToRuntime = useCallback((settings: CloudSettings) => {
    const iframe = iframeRef.current;
    const win = iframe?.contentWindow as PVWindow | undefined;
    const doc = iframe?.contentDocument;
    if (!win) return;
    if (!doc) return;
    const runtimeGame = win.__pv?.game?.view?.game as
      | {
          cloudArray?: Array<Record<string, unknown>>;
          cloudContainer?: {
            children?: Array<Record<string, unknown>>;
            getChildAt?: (idx: number) => Record<string, unknown>;
            scale?: { x?: number; y?: number };
          };
          container?: { visible?: boolean };
        }
      | undefined;
    if (!runtimeGame?.cloudArray || !runtimeGame.cloudContainer) return;
    const gameCanvas = doc.getElementById("game-canvas") as HTMLCanvasElement | null;
    const gameContainer = doc.getElementById("game-canvas-container") as HTMLElement | null;
    if (!gameCanvas || !gameContainer) return;

    const cloudArray = runtimeGame.cloudArray;
    const cloudContainer = runtimeGame.cloudContainer;
    const children = cloudContainer.children || [];
    const textureFrom = win.PIXI?.Texture?.from;
    const cacheKey = `${settings.themeId}-${settings.fxLevel}`;
    if (textureFrom) {
      if (!win.__hostCloudTextureCache) win.__hostCloudTextureCache = {};
      if (!win.__hostCloudTextureCache[cacheKey]) {
        win.__hostCloudTextureCache[cacheKey] = textureFrom(renderCloudThemeCanvas(settings.themeId, settings.fxLevel));
      }
      const texture = win.__hostCloudTextureCache[cacheKey];
      for (let i = 0; i < children.length; i += 1) {
        const sprite = (cloudContainer.getChildAt ? cloudContainer.getChildAt(i) : children[i]) as
          | { texture?: unknown }
          | undefined;
        if (sprite) sprite.texture = texture;
      }
    }

    if (typeof win.__hostCloudTuneTimer === "number") {
      win.clearInterval(win.__hostCloudTuneTimer);
    }

    win.__hostCloudTuneTimer = win.setInterval(() => {
      const density = Math.max(4, Math.min(16, Math.round(settings.density)));
      const speedMul = Math.max(0.4, Math.min(2, settings.speed / 100));
      const sizeMul = Math.max(0.7, Math.min(1.6, settings.size / 100));
      const opacityMul = Math.max(0.2, Math.min(1, settings.opacity / 100));
      const tintByTheme: Record<CloudThemeId, number> = {
        sunny: 0xffffff,
        overcast: 0xdbe2ee,
        sunset: 0xffcb9f,
        cyber: 0x9befff,
        storm: 0xc2ccde,
      };
      const now = Date.now() / 1000;

      if (cloudContainer.scale) {
        cloudContainer.scale.x = sizeMul;
        cloudContainer.scale.y = sizeMul;
      }

      for (let i = 0; i < Math.max(children.length, cloudArray.length); i += 1) {
        const cloud = cloudArray[i] as
          | { topLeftPointX?: number; topLeftPointXVelocity?: number; spriteWidth?: number; spriteHeight?: number; __hostBaseVel?: number }
          | undefined;
        const sprite = (cloudContainer.getChildAt ? cloudContainer.getChildAt(i) : children[i]) as
          | { visible?: boolean; alpha?: number; width?: number; height?: number; tint?: number }
          | undefined;
        if (!cloud || !sprite) continue;

        if (i >= density) {
          sprite.visible = false;
          cloud.topLeftPointX = -220 - i * 12;
          continue;
        }
        sprite.visible = true;

        if (!Number.isFinite(cloud.__hostBaseVel as number)) {
          cloud.__hostBaseVel = Number(cloud.topLeftPointXVelocity) || 1;
        }
        cloud.topLeftPointXVelocity = Math.max(0.35, Math.min(4.5, (cloud.__hostBaseVel || 1) * speedMul));

        const fxPulse =
          settings.fxLevel === "low" ? 1 : settings.fxLevel === "medium" ? 0.9 + 0.1 * Math.sin(now * 1.6 + i) : 0.8 + 0.2 * Math.sin(now * 2.4 + i * 0.7);
        sprite.alpha = Math.max(0.08, Math.min(1, opacityMul * fxPulse));
        sprite.tint = tintByTheme[settings.themeId];

        // Size is controlled by cloudContainer scale because internal game render resets sprite width/height each frame.
      }
    }, 60);

    if (typeof win.__hostWeatherRaf === "number") {
      win.cancelAnimationFrame(win.__hostWeatherRaf);
      win.__hostWeatherRaf = undefined;
    }

    let weatherCanvas = doc.getElementById("host-weather-overlay") as HTMLCanvasElement | null;
    if (!weatherCanvas) {
      weatherCanvas = doc.createElement("canvas");
      weatherCanvas.id = "host-weather-overlay";
      weatherCanvas.width = 432;
      weatherCanvas.height = 304;
      weatherCanvas.style.position = "absolute";
      weatherCanvas.style.left = "0";
      weatherCanvas.style.top = "0";
      weatherCanvas.style.pointerEvents = "none";
      weatherCanvas.style.imageRendering = "pixelated";
      weatherCanvas.style.zIndex = "4";
      gameContainer.appendChild(weatherCanvas);
    }
    const wctx = weatherCanvas.getContext("2d");
    if (!wctx) return;
    const particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; kind: "rain" | "snow" }> = [];
    let lightningFlash = 0;
    let lightningBoltLife = 0;
    let lightningCooldown = 30;
    let lightningX = 120;
    let lightningPath: Array<{ x: number; y: number }> = [];
    let lightningPath2: Array<{ x: number; y: number }> = [];

    const drawWeather = () => {
      if (!weatherCanvas) return;
      weatherCanvas.style.left = `${gameCanvas.offsetLeft}px`;
      weatherCanvas.style.top = `${gameCanvas.offsetTop}px`;
      weatherCanvas.style.width = `${gameCanvas.clientWidth}px`;
      weatherCanvas.style.height = `${gameCanvas.clientHeight}px`;
      const inGameScene = Boolean(runtimeGame.container?.visible);
      wctx.clearRect(0, 0, 432, 304);
      if (!inGameScene) {
        particles.length = 0;
        win.__hostWeatherRaf = win.requestAnimationFrame(drawWeather);
        return;
      }

      const weatherMode: "none" | "rain" | "snow" | "storm" =
        settings.themeId === "overcast" ? "rain" : settings.themeId === "cyber" ? "snow" : settings.themeId === "storm" ? "storm" : "none";
      if (weatherMode === "none") {
        particles.length = 0;
        win.__hostWeatherRaf = win.requestAnimationFrame(drawWeather);
        return;
      }

      const freqMul = Math.max(0.4, Math.min(1.8, settings.weatherFrequency / 100));
      const sizeMul = Math.max(0.6, Math.min(1.7, settings.weatherSize / 100));
      const fxBoost = settings.fxLevel === "low" ? 0.9 : settings.fxLevel === "medium" ? 1 : 1.15;
      const spawnBase = weatherMode === "snow" ? 1.2 : weatherMode === "storm" ? 0.9 : 2;
      const spawnCount = Math.max(1, Math.floor(spawnBase * freqMul * fxBoost));

      for (let i = 0; i < spawnCount; i += 1) {
        if (particles.length > 320) break;
        if (weatherMode === "snow") {
          particles.push({
            x: Math.random() * 432,
            y: -8 - Math.random() * 24,
            vx: -0.35 + Math.random() * 0.7,
            vy: 0.45 + Math.random() * 0.55,
            size: (1.2 + Math.random() * 1.8) * sizeMul,
            kind: "snow",
          });
        } else {
          particles.push({
            x: Math.random() * 432,
            y: -12 - Math.random() * 20,
            vx: -0.45 + Math.random() * 0.7,
            vy: 3.4 + Math.random() * 2.8,
            size: (1.8 + Math.random() * 1.8) * sizeMul,
            kind: "rain",
          });
        }
      }

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        if (p.kind === "rain") {
          p.vx += (-0.05 + Math.random() * 0.1) * 0.35;
          if (p.vx < -1.8) p.vx = -1.8;
          if (p.vx > 1.8) p.vx = 1.8;
        } else {
          p.vx += (-0.05 + Math.random() * 0.1) * 0.18;
          if (p.vx < -0.95) p.vx = -0.95;
          if (p.vx > 0.95) p.vx = 0.95;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > 316 || p.x < -20 || p.x > 452) {
          particles.splice(i, 1);
          continue;
        }
        if (p.kind === "snow") {
          wctx.fillStyle = "rgba(240,248,255,0.78)";
          const s = Math.max(1, p.size);
          wctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
        } else {
          wctx.strokeStyle = weatherMode === "storm" ? "rgba(214,228,245,0.34)" : "rgba(208,228,255,0.58)";
          wctx.lineWidth = Math.max(1, p.size * 0.42);
          wctx.beginPath();
          wctx.moveTo(Math.round(p.x), Math.round(p.y));
          wctx.lineTo(Math.round(p.x - p.vx * 1.4), Math.round(p.y - p.vy * 1.6));
          wctx.stroke();
        }
      }

      if (weatherMode === "storm") {
        lightningCooldown -= 1;
        if (lightningCooldown <= 0) {
          const chance = settings.fxLevel === "high" ? 0.15 : settings.fxLevel === "medium" ? 0.1 : 0.06;
          if (Math.random() < chance * freqMul) {
            lightningFlash = settings.fxLevel === "high" ? 0.95 : settings.fxLevel === "medium" ? 0.78 : 0.62;
            lightningBoltLife = settings.fxLevel === "high" ? 7 : settings.fxLevel === "medium" ? 5 : 4;
            lightningX = 20 + Math.random() * 392;
            lightningPath = [{ x: lightningX, y: 0 }];
            let lx = lightningX;
            let ly = 0;
            const segCount = settings.fxLevel === "high" ? 9 : 7;
            for (let seg = 0; seg < segCount; seg += 1) {
              lx += -18 + Math.random() * 36;
              ly += 18 + Math.random() * 26;
              lightningPath.push({ x: lx, y: ly });
            }
            lightningPath2 = [];
            if (settings.fxLevel !== "low" && Math.random() < 0.55) {
              const start = lightningX + (-46 + Math.random() * 92);
              lightningPath2.push({ x: start, y: 0 });
              let bx = start;
              let by = 0;
              const seg2 = 4 + Math.floor(Math.random() * 4);
              for (let seg = 0; seg < seg2; seg += 1) {
                bx += -20 + Math.random() * 40;
                by += 22 + Math.random() * 24;
                lightningPath2.push({ x: bx, y: by });
              }
            }
          }
          lightningCooldown = 6 + Math.floor(Math.random() * 30);
        }
        if (lightningFlash > 0.02) {
          // Full-sky flash, then quickly fade out.
          wctx.fillStyle = `rgba(255,255,255,${Math.min(0.58, lightningFlash * 0.62)})`;
          wctx.fillRect(0, 0, 432, 304);
          if (lightningBoltLife > 0 && lightningPath.length > 1) {
            wctx.strokeStyle = `rgba(245,250,255,${Math.min(1, lightningFlash)})`;
            wctx.lineWidth = settings.fxLevel === "high" ? 2.6 : 2;
            wctx.beginPath();
            wctx.moveTo(lightningPath[0].x, lightningPath[0].y);
            for (let i = 1; i < lightningPath.length; i += 1) {
              wctx.lineTo(lightningPath[i].x, lightningPath[i].y);
            }
            wctx.stroke();
            if (lightningPath2.length > 1) {
              wctx.lineWidth = settings.fxLevel === "high" ? 1.8 : 1.4;
              wctx.beginPath();
              wctx.moveTo(lightningPath2[0].x, lightningPath2[0].y);
              for (let i = 1; i < lightningPath2.length; i += 1) {
                wctx.lineTo(lightningPath2[i].x, lightningPath2[i].y);
              }
              wctx.stroke();
            }
            lightningBoltLife -= 1;
          }
          lightningFlash *= 0.62;
        }
      }

      win.__hostWeatherRaf = win.requestAnimationFrame(drawWeather);
    };

    win.__hostWeatherRaf = win.requestAnimationFrame(drawWeather);
  }, []);

  const applyDifficultyToRuntime = useCallback((difficulty: DifficultyId) => {
    const iframe = iframeRef.current;
    const win = iframe?.contentWindow as PVWindow | undefined;
    const game = win?.__pv?.game;
    const physics = game?.physics;
    if (!physics) return;

    const targetBoldness = DIFFICULTY_BOLDNESS[difficulty];
    const players = [physics.player1, physics.player2].filter(Boolean) as Array<{
      isComputer?: boolean;
      computerBoldness?: number;
      initializeForNewRound?: (...args: unknown[]) => void;
      __hostDiffWrapped?: boolean;
      __hostOriginalInit?: (...args: unknown[]) => void;
    }>;

    players.forEach((player) => {
      if (!player.__hostDiffWrapped && typeof player.initializeForNewRound === "function") {
        player.__hostOriginalInit = player.initializeForNewRound;
        player.initializeForNewRound = function wrappedInitializeForNewRound(...args: unknown[]) {
          player.__hostOriginalInit?.apply(this, args);
          if (this && typeof this === "object" && (this as { isComputer?: boolean }).isComputer) {
            (this as { computerBoldness?: number }).computerBoldness =
              DIFFICULTY_BOLDNESS[selectedDifficultyRef.current];
          }
        };
        player.__hostDiffWrapped = true;
      }
      if (player.isComputer) {
        player.computerBoldness = targetBoldness;
      }
    });
  }, []);

  const wireIframe = useCallback(() => {
    const iframe = iframeRef.current;
    const win = iframe?.contentWindow as PVWindow | null;
    const doc = iframe?.contentDocument;
    if (!iframe || !win || !doc) return;
    setIframeReady(false);

    try {
      if ("serviceWorker" in win.navigator && win.navigator.serviceWorker.getRegistrations) {
        void win.navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => {
            void reg.unregister();
          });
        });
      }
    } catch {
      // ignore unregister failures
    }

    doc.documentElement.style.overflow = "hidden";
    doc.body.style.overflow = "hidden";
    const flexContainer = doc.getElementById("flex-container") as HTMLElement | null;
    if (flexContainer) {
      flexContainer.style.height = "auto";
      flexContainer.style.minHeight = "0";
      flexContainer.style.paddingBottom = "0";
    }

    if (!doc.getElementById("host-style-patch")) {
      const stylePatch = doc.createElement("style");
      stylePatch.id = "host-style-patch";
      stylePatch.textContent = `
        #options-dropdown .btn,
        #options-dropdown .submenu > .btn {
          white-space: nowrap !important;
          word-break: keep-all !important;
          line-height: 1.1 !important;
          width: auto !important;
          min-width: calc(1.7 * var(--btn-width)) !important;
          padding: 0 14px !important;
        }
        #options-dropdown .submenu > .btn {
          min-width: calc(1.75 * var(--btn-width)) !important;
        }
        #reset-to-default-btn {
          min-width: calc(2.05 * var(--btn-width)) !important;
        }
        #host-game-dropdown {
          min-width: 172px !important;
        }
        #host-game-dropdown .btn {
          white-space: nowrap !important;
          word-break: keep-all !important;
          width: auto !important;
          min-width: 172px !important;
          padding: 0 14px !important;
        }
        /* Force-hide irrelevant popups/prompts so card opens straight into loading -> game */
        .if-embedded-in-other-website,
        #about-box,
        #notice-box-1,
        #notice-box-2,
        #update-notification-message-box {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `;
      doc.head.appendChild(stylePatch);
    }

    const setVolumeAll = (value: number) => {
      const vol = Math.max(0, Math.min(1, value));
      try {
        const soundApi = win.PIXI?.sound;
        if (soundApi) soundApi.volumeAll = vol;
      } catch {
        // ignore
      }
    };

    const embedNotice = doc.querySelector(".if-embedded-in-other-website") as HTMLElement | null;
    if (embedNotice) embedNotice.classList.add("hidden");
    const aboutBox = doc.getElementById("about-box") as HTMLElement | null;
    const noticeBox1 = doc.getElementById("notice-box-1") as HTMLElement | null;
    const noticeBox2 = doc.getElementById("notice-box-2") as HTMLElement | null;
    const updateNoticeBox = doc.getElementById("update-notification-message-box") as HTMLElement | null;
    [aboutBox, noticeBox1, noticeBox2, updateNoticeBox].forEach((box) => {
      if (!box) return;
      box.classList.add("hidden");
      box.style.display = "none";
      box.style.pointerEvents = "none";
    });

    const optionsDropdown = doc.getElementById("options-dropdown") as HTMLElement | null;
    if (optionsDropdown && !doc.getElementById("host-difficulty-submenu-btn")) {
      const difficultyWrap = doc.createElement("div");
      difficultyWrap.className = "relative-container";

      const difficultyBtn = doc.createElement("button");
      difficultyBtn.type = "button";
      difficultyBtn.id = "host-difficulty-submenu-btn";
      difficultyBtn.className = "btn submenu-btn";
      difficultyBtn.innerHTML = "難度 &#9654;&#xfe0e;";

      const difficultyMenu = doc.createElement("div");
      difficultyMenu.id = "host-difficulty-submenu";
      difficultyMenu.className = "submenu";

      (["low", "normal", "high"] as DifficultyId[]).forEach((difficulty) => {
        const btn = doc.createElement("button");
        btn.type = "button";
        btn.className = "btn";
        btn.dataset.difficulty = difficulty;
        btn.innerHTML = `<span class=\"check\">&check; </span>${DIFFICULTY_LABELS[difficulty]}`;
        btn.addEventListener("click", () => {
          setSelectedDifficulty(difficulty);
        });
        difficultyMenu.appendChild(btn);
      });

      const resetBtn = doc.getElementById("reset-to-default-btn");
      difficultyWrap.appendChild(difficultyBtn);
      difficultyWrap.appendChild(difficultyMenu);
      if (resetBtn && resetBtn.parentElement === optionsDropdown) {
        optionsDropdown.insertBefore(difficultyWrap, resetBtn);
      } else {
        optionsDropdown.appendChild(difficultyWrap);
      }

      const openDifficultyMenu = () => {
        doc.querySelectorAll(".submenu").forEach((el) => el.classList.remove("show"));
        doc.querySelectorAll(".submenu-btn").forEach((el) => el.classList.remove("open"));
        difficultyBtn.classList.add("open");
        difficultyMenu.classList.add("show");
      };
      difficultyBtn.addEventListener("mouseover", openDifficultyMenu);
      difficultyBtn.addEventListener("click", openDifficultyMenu);
    }

    doc.querySelectorAll("#host-difficulty-submenu .btn[data-difficulty]").forEach((el) => {
      const btn = el as HTMLButtonElement;
      if (btn.dataset.difficulty === selectedDifficultyRef.current) btn.classList.add("selected");
      else btn.classList.remove("selected");
    });

    const aboutBtn = doc.getElementById("about-btn") as HTMLButtonElement | null;
    if (aboutBtn) {
      const aboutText = aboutBtn.querySelector(".text-about") as HTMLElement | null;
      if (aboutText) {
        aboutText.textContent = "幫助";
        aboutText.classList.remove("hidden");
      }
      const playText = aboutBtn.querySelector(".text-play") as HTMLElement | null;
      if (playText) playText.classList.add("hidden");
      aboutBtn.classList.remove("glow");
    }
    const closeAboutBtn = doc.getElementById("close-about-btn") as HTMLButtonElement | null;
    // Force into loading/game flow without showing About/Notice overlays.
    closeAboutBtn?.click();

    const rightButtons = doc.querySelector("#menu-bar .btn-container.right") as HTMLElement | null;
    const leftButtons = doc.querySelector("#menu-bar .btn-container.left") as HTMLElement | null;
    const menuBar = doc.getElementById("menu-bar") as HTMLElement | null;

    if (menuBar && !doc.getElementById("host-volume-wrap")) {
      const volumeWrap = doc.createElement("div");
      volumeWrap.id = "host-volume-wrap";
      volumeWrap.className = "btn";
      volumeWrap.style.display = "inline-flex";
      volumeWrap.style.alignItems = "center";
      volumeWrap.style.justifyContent = "center";
      volumeWrap.style.gap = "10px";
      volumeWrap.style.marginLeft = "10px";
      volumeWrap.style.marginRight = "10px";
      volumeWrap.style.padding = "0 10px";
      volumeWrap.style.width = "min(calc(2 * var(--btn-width)), calc((var(--canvas-width) - 30px) / 2.3))";
      volumeWrap.style.minWidth = "210px";
      volumeWrap.style.color = "var(--btn-color)";
      volumeWrap.style.fontSize = "var(--font-size)";
      volumeWrap.style.cursor = "default";
      volumeWrap.style.whiteSpace = "nowrap";
      volumeWrap.innerHTML = "<span style='opacity:.9; letter-spacing:.03em; font-size:inherit;'>音量</span>";

      const slider = doc.createElement("input");
      slider.type = "range";
      slider.min = "0";
      slider.max = "100";
      slider.step = "1";
      slider.value = "50";
      slider.style.width = "116px";
      slider.style.height = "4px";
      slider.style.accentColor = "#e7bf4b";
      slider.style.borderRadius = "999px";
      slider.style.background = "rgba(255,255,255,0.18)";
      slider.style.cursor = "pointer";
      slider.addEventListener("click", (event) => event.stopPropagation());
      slider.addEventListener("input", () => {
        setVolumeAll(Number(slider.value) / 100);
      });
      volumeWrap.appendChild(slider);

      menuBar.insertBefore(volumeWrap, rightButtons || null);
      setTimeout(() => setVolumeAll(0.5), 120);
    }

    const gameDropdownBtn = doc.getElementById("game-dropdown-btn") as HTMLButtonElement | null;
    const pauseBtn = doc.getElementById("pause-btn") as HTMLButtonElement | null;
    const restartBtn = doc.getElementById("restart-btn") as HTMLButtonElement | null;
    if (gameDropdownBtn) {
      const gameContainer = gameDropdownBtn.closest(".relative-container") as HTMLElement | null;
      if (gameContainer) gameContainer.style.display = "none";
    }

    if (leftButtons) {
      if (!doc.getElementById("host-game-menu-container")) {
        const gameMenuContainer = doc.createElement("div");
        gameMenuContainer.id = "host-game-menu-container";
        gameMenuContainer.className = "relative-container";
        gameMenuContainer.style.marginRight = "10px";

        const gameBtn = doc.createElement("button");
        gameBtn.type = "button";
        gameBtn.id = "host-game-btn";
        gameBtn.className = "btn dropdown-btn";
        gameBtn.textContent = "遊戲";

        const gameDropdown = doc.createElement("div");
        gameDropdown.id = "host-game-dropdown";
        gameDropdown.className = "dropdown";

        const hostPauseBtn = doc.createElement("button");
        hostPauseBtn.type = "button";
        hostPauseBtn.className = "btn";
        hostPauseBtn.textContent = "暫停";
        hostPauseBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          pauseBtn?.click();
          gameDropdown.classList.remove("show");
        });

        const hostRestartBtn = doc.createElement("button");
        hostRestartBtn.type = "button";
        hostRestartBtn.className = "btn";
        hostRestartBtn.textContent = "重開遊戲";
        hostRestartBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          restartBtn?.click();
          gameDropdown.classList.remove("show");
        });

        const hostThemeBtn = doc.createElement("button");
        hostThemeBtn.type = "button";
        hostThemeBtn.className = "btn";
        hostThemeBtn.textContent = "排球主題設置";
        hostThemeBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          gameDropdown.classList.remove("show");
          setThemeEditorOpen(true);
        });

        const hostBgThemeBtn = doc.createElement("button");
        hostBgThemeBtn.type = "button";
        hostBgThemeBtn.className = "btn";
        hostBgThemeBtn.textContent = "背景主題設置";
        hostBgThemeBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          gameDropdown.classList.remove("show");
          setBackgroundEditorOpen(true);
        });

        const hostHistoryBtn = doc.createElement("button");
        hostHistoryBtn.type = "button";
        hostHistoryBtn.className = "btn";
        hostHistoryBtn.textContent = "歷史記錄";
        hostHistoryBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          gameDropdown.classList.remove("show");
          setHistoryOpen(true);
        });

        const hostRemapBtn = doc.createElement("button");
        hostRemapBtn.type = "button";
        hostRemapBtn.className = "btn";
        hostRemapBtn.textContent = "鍵位設置";
        hostRemapBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          gameDropdown.classList.remove("show");
          setRemapOpen(true);
        });

        gameDropdown.appendChild(hostPauseBtn);
        gameDropdown.appendChild(hostRestartBtn);
        gameDropdown.appendChild(hostRemapBtn);
        gameDropdown.appendChild(hostThemeBtn);
        gameDropdown.appendChild(hostBgThemeBtn);
        gameDropdown.appendChild(hostHistoryBtn);
        gameMenuContainer.appendChild(gameBtn);
        gameMenuContainer.appendChild(gameDropdown);

        gameBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          gameDropdown.classList.toggle("show");
        });

        doc.addEventListener("click", (event) => {
          const target = event.target as Node | null;
          if (target && gameMenuContainer.contains(target)) return;
          gameDropdown.classList.remove("show");
        });

        leftButtons.insertBefore(gameMenuContainer, leftButtons.firstChild);
      }
    }

    if (rightButtons) {
      const oldRemapBtn = doc.getElementById("host-remap-btn");
      if (oldRemapBtn) oldRemapBtn.remove();

      if (onClose && !doc.getElementById("host-close-btn")) {
        const closeBtn = doc.createElement("button");
        closeBtn.type = "button";
        closeBtn.id = "host-close-btn";
        closeBtn.className = "btn";
        closeBtn.textContent = "關閉";
        closeBtn.style.minWidth = "84px";
        closeBtn.style.marginLeft = "10px";
        closeBtn.style.borderRadius = "12px";
        closeBtn.addEventListener("click", (event) => {
          event.preventDefault();
          onClose();
        });
        rightButtons.appendChild(closeBtn);
      }
    }

    const recalcHeight = () => {
      const gameContainer = doc.getElementById("game-canvas-container") as HTMLElement | null;
      if (!gameContainer) return false;
      const gameBottom = gameContainer.offsetTop + gameContainer.offsetHeight;
      setFrameHeight(Math.max(500, Math.min(900, gameBottom + 12)));
      return true;
    };
    if (!recalcHeight()) {
      let tries = 0;
      const timer = win.setInterval(() => {
        tries += 1;
        if (recalcHeight() || tries > 25) {
          win.clearInterval(timer);
        }
      }, 120);
    }

    const keyProxy = (event: KeyboardEvent) => {
      const mappedCode = keyRouteMapRef.current[event.code];
      if (!mappedCode) return;

      event.preventDefault();
      event.stopPropagation();
      const translated = new KeyboardEvent(event.type, {
        key: mappedCode.replace("Key", "").toLowerCase(),
        code: mappedCode,
        bubbles: true,
        cancelable: true,
      });
      win.dispatchEvent(translated);
    };
    doc.addEventListener("keydown", keyProxy, true);
    doc.addEventListener("keyup", keyProxy, true);

    let pvTries = 0;
    const pvTimer = win.setInterval(() => {
      pvTries += 1;
      if (win.__pv) {
        win.clearInterval(pvTimer);
        void applyBallThemeToRuntime(selectedBallThemeRef.current);
        applyCloudThemeToRuntime(cloudSettingsRef.current);
        applyDifficultyToRuntime(selectedDifficultyRef.current);

        if (typeof win.__hostMatchWatchTimer === "number") {
          win.clearInterval(win.__hostMatchWatchTimer);
        }
        win.__hostMatchCaptured = false;
        win.__hostMatchWatchTimer = win.setInterval(() => {
          const game = win.__pv?.game as
            | {
                scores?: number[];
                winningScore?: number;
                gameEnded?: boolean;
              }
            | undefined;
          if (!game || !Array.isArray(game.scores) || game.scores.length < 2) return;
          const p1 = Number(game.scores[0]);
          const p2 = Number(game.scores[1]);
          const winning = Number(game.winningScore || 15);
          if (!Number.isFinite(p1) || !Number.isFinite(p2) || !Number.isFinite(winning)) return;

          const gameEnded = Boolean(game.gameEnded);
          if (gameEnded && !win.__hostMatchCaptured && (p1 >= winning || p2 >= winning)) {
            win.__hostMatchCaptured = true;
            const now = new Date().toISOString();
            const record: MatchHistoryRecord = {
              id: `pv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              createdAt: now,
              p1Score: p1,
              p2Score: p2,
              winningScore: winning,
              difficulty: selectedDifficultyRef.current,
              themeId: selectedBallThemeRef.current,
              themePreviewSrc: themePreviewForRecord(selectedBallThemeRef.current),
              synced: false,
            };
            persistHistoryRecord(record);
            void syncHistoryRecordIfLoggedIn(record);
          }

          if (!gameEnded && p1 === 0 && p2 === 0) {
            win.__hostMatchCaptured = false;
          }
        }, 500);
      }
      if (pvTries > 40) {
        win.clearInterval(pvTimer);
      }
    }, 120);

    win.setTimeout(() => {
      setIframeReady(true);
    }, 60);
  }, [
    applyBallThemeToRuntime,
    applyCloudThemeToRuntime,
    applyDifficultyToRuntime,
    onClose,
    persistHistoryRecord,
    syncHistoryRecordIfLoggedIn,
    themePreviewForRecord,
  ]);

  useEffect(() => {
    void applyBallThemeToRuntime(selectedBallTheme);
  }, [applyBallThemeToRuntime, selectedBallTheme]);

  useEffect(() => {
    applyDifficultyToRuntime(selectedDifficulty);
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.querySelectorAll("#host-difficulty-submenu .btn[data-difficulty]").forEach((el) => {
      const btn = el as HTMLButtonElement;
      if (btn.dataset.difficulty === selectedDifficulty) btn.classList.add("selected");
      else btn.classList.remove("selected");
    });
  }, [applyDifficultyToRuntime, selectedDifficulty]);

  useEffect(() => {
    applyCloudThemeToRuntime(cloudSettings);
  }, [applyCloudThemeToRuntime, cloudSettings]);

  useEffect(() => {
    const iframe = iframeRef.current;
    return () => {
      const win = iframe?.contentWindow as PVWindow | null;
      if (win && typeof win.__hostMatchWatchTimer === "number") {
        win.clearInterval(win.__hostMatchWatchTimer);
        win.__hostMatchWatchTimer = undefined;
      }
      if (win && typeof win.__hostCloudTuneTimer === "number") {
        win.clearInterval(win.__hostCloudTuneTimer);
        win.__hostCloudTuneTimer = undefined;
      }
      if (win && typeof win.__hostWeatherRaf === "number") {
        win.cancelAnimationFrame(win.__hostWeatherRaf);
        win.__hostWeatherRaf = undefined;
      }
    };
  }, []);

  if (!mobileCheckDone) {
    return (
      <section className="relative mx-auto w-full max-w-[1120px]">
        <div className="rounded-[22px] border border-[var(--site-border)] bg-white p-8 text-center shadow-[0_14px_34px_rgba(35,23,28,0.09)]">
          <p className="text-sm text-black/65">正在檢測設備相容性...</p>
        </div>
      </section>
    );
  }

  if (isMobileLike) {
    return (
      <section className="relative mx-auto w-full max-w-[1120px]">
        <div className="rounded-[22px] border border-[var(--site-border)] bg-white p-8 text-center shadow-[0_14px_34px_rgba(35,23,28,0.09)]">
          <h3 className="text-xl font-semibold text-[#232629]">此遊戲目前不支援手機瀏覽器</h3>
          <p className="mt-2 text-sm text-black/65">請在桌面端（Windows / macOS）瀏覽器中開啟遊玩。</p>
          {onClose ? (
            <div className="mt-5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-[10px] border border-black/20 bg-white px-4 py-1.5 text-sm"
              >
                返回
              </button>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="relative mx-auto w-full max-w-[1120px]">
      <div className="overflow-hidden rounded-[22px] border border-[var(--site-border)] bg-white shadow-[0_14px_34px_rgba(35,23,28,0.09)]">
        <iframe
          ref={iframeRef}
          src={LOCAL_FULL_REMAKE_URL}
          title="Pikachu Volleyball Full Local Remake"
          className="block w-full border-0"
          style={{
            height: `${frameHeight}px`,
            visibility: iframeReady ? "visible" : "hidden",
          }}
          scrolling="no"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="autoplay; fullscreen"
          onLoad={wireIframe}
        />
      </div>

      {remapOpen ? (
        <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-[760px] rounded-2xl border border-black/30 bg-[rgba(255,255,255,0.82)] p-5 text-[#232629] shadow-[0_20px_50px_rgba(0,0,0,0.28)] backdrop-blur-[1.5px]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">鍵位設定</h3>
              <button
                type="button"
                onClick={() => {
                  setCaptureTarget(null);
                  setRemapOpen(false);
                }}
                className="rounded-[10px] border border-transparent bg-[rgba(50,50,50,1)] px-4 py-1.5 text-sm text-white"
              >
                關閉
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {(["p1", "p2"] as PlayerKey[]).map((player) => (
                <div key={player} className="rounded-xl border border-black/10 bg-[rgba(255,255,255,0.55)] p-3">
                  <div className="mb-3 text-sm font-semibold">{player === "p1" ? "玩家 1" : "玩家 2"}</div>
                  <div className="space-y-2">
                    {(["left", "right", "up", "down", "hit"] as ActionKey[]).map((action) => (
                      <div key={`${player}-${action}`} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-[#232629]">{ACTION_LABELS[action]}</span>
                        <button
                          type="button"
                          onClick={() => setCaptureTarget({ player, action })}
                          className="min-w-[132px] rounded-[10px] border border-transparent bg-[rgba(50,50,50,1)] px-3 py-1.5 text-sm text-white"
                        >
                          {captureTarget?.player === player && captureTarget?.action === action
                            ? "請按任意鍵..."
                            : codeLabel(bindings[player][action])}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setBindings(DEFAULT_BINDINGS);
                  setCaptureTarget(null);
                }}
                className="rounded-[10px] border border-transparent bg-[rgba(50,50,50,1)] px-4 py-1.5 text-sm text-white"
              >
                恢復預設
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {themeEditorOpen ? (
        <div className="absolute inset-0 z-[125] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-[760px] rounded-2xl border border-black/30 bg-[rgba(255,255,255,0.92)] p-5 text-[#232629] shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            <div className="mb-3">
              <h3 className="text-lg font-semibold">排球主題設置</h3>
              <p className="mt-1 text-xs text-black/55">點選即時生效，無需手動套用</p>
            </div>

            <div className="mb-4 rounded-xl border border-black/10 bg-white/70 p-3">
              <div className="mb-2 text-sm font-semibold">預設主題（即時）</div>
              <div className="grid grid-cols-7 items-stretch gap-2 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSelectedBallTheme("default")}
                  className={`w-full rounded-xl border px-1 py-1.5 text-xs ${
                    selectedBallTheme === "default"
                      ? "border-black/80 bg-[rgba(50,50,50,1)] text-white"
                      : "border-black/20 bg-white text-[#232629]"
                  }`}
                >
                  <span className="flex min-w-0 flex-col items-center gap-1">
                    <NextImage
                      src={THEME_PREVIEW_SRC.default}
                      alt={THEME_DISPLAY_NAME.default}
                      width={24}
                      height={24}
                      unoptimized
                      className="h-6 w-6 rounded-full border border-black/15 object-cover"
                    />
                    <span className="whitespace-nowrap text-[11px] leading-none">{THEME_DISPLAY_NAME.default}</span>
                  </span>
                </button>
                {PRESET_THEME_IDS.map((themeId) => (
                  <button
                    key={themeId}
                    type="button"
                    onClick={() => setSelectedBallTheme(themeId)}
                    className={`w-full rounded-xl border px-1 py-1.5 text-xs ${
                      selectedBallTheme === themeId
                        ? "border-black/80 bg-[rgba(50,50,50,1)] text-white"
                        : "border-black/20 bg-white text-[#232629]"
                    }`}
                  >
                    <span className="flex min-w-0 flex-col items-center gap-1">
                      <NextImage
                        src={THEME_PREVIEW_SRC[themeId]}
                        alt={THEME_DISPLAY_NAME[themeId]}
                        width={24}
                        height={24}
                        unoptimized
                        className="h-6 w-6 rounded-full border border-black/15 object-cover"
                      />
                      <span className="whitespace-nowrap text-[11px] leading-none">{THEME_DISPLAY_NAME[themeId]}</span>
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    if (customBallDataUrl) setSelectedBallTheme("custom");
                  }}
                  className={`w-full rounded-xl border px-1 py-1.5 text-xs ${
                    selectedBallTheme === "custom"
                      ? "border-black/80 bg-[rgba(50,50,50,1)] text-white"
                      : "border-black/20 bg-white text-[#232629]"
                  } ${customBallDataUrl ? "" : "opacity-55"}`}
                  title={customBallDataUrl ? "使用自定義球" : "請先上傳自定義圖片"}
                >
                  <span className="flex min-w-0 flex-col items-center gap-1">
                    <NextImage
                      src={customBallDataUrl || THEME_PREVIEW_SRC.default}
                      alt={THEME_DISPLAY_NAME.custom}
                      width={24}
                      height={24}
                      unoptimized
                      className="h-6 w-6 rounded-full border border-black/15 object-cover"
                    />
                    <span className="whitespace-nowrap text-[11px] leading-none">{THEME_DISPLAY_NAME.custom}</span>
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
              <div className="flex items-center justify-center">
                <div
                  className={`relative h-[192px] w-[192px] overflow-hidden rounded-full border border-black/20 bg-[#e9ecf1] ${
                    editingImageDataUrl || customBallDataUrl ? "cursor-grab" : ""
                  } ${isDraggingPreview ? "cursor-grabbing" : ""}`}
                  onMouseDown={(event) => {
                    if (!(editingImageDataUrl || customBallDataUrl)) return;
                    setIsDraggingPreview(true);
                    dragStartRef.current = {
                      x: event.clientX,
                      y: event.clientY,
                      ox: editOffsetX,
                      oy: editOffsetY,
                    };
                  }}
                >
                  {editingImageDataUrl || customBallDataUrl ? (
                    <NextImage
                      src={editingImageDataUrl || customBallDataUrl || ""}
                      alt="預覽"
                      width={192}
                      height={192}
                      unoptimized
                      className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                      style={{
                        transform: `translate(calc(-50% + ${editOffsetX}px), calc(-50% + ${editOffsetY}px)) scale(${editZoom})`,
                        transformOrigin: "center center",
                        width: "auto",
                        height: "auto",
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-black/45">請先上傳圖片</div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-semibold">自定義主題（即時）</div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center rounded-[10px] border border-transparent bg-[rgba(50,50,50,1)] px-3 py-1.5 text-sm text-white">
                    上傳自定義
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result !== "string") return;
                          setEditingImageDataUrl(reader.result);
                          setSelectedBallTheme("custom");
                          setEditOffsetX(0);
                          setEditOffsetY(0);
                          setEditZoom(1);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingImageDataUrl(null);
                      setCustomBallDataUrl(null);
                      if (selectedBallTheme === "custom") setSelectedBallTheme("default");
                    }}
                    className="rounded-[10px] border border-black/20 bg-white px-3 py-1.5 text-sm text-[#232629]"
                  >
                    清除自定義
                  </button>
                  <span className="text-xs text-black/60">拖拽圓形預覽即可調整位置</span>
                </div>

                <label className="block text-sm">
                  縮放
                  <input
                    type="range"
                    min={70}
                    max={260}
                    step={1}
                    value={Math.round(editZoom * 100)}
                    onChange={(e) => setEditZoom(Number(e.target.value) / 100)}
                    className="mt-1 w-full"
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setThemeEditorOpen(false)}
                className="rounded-[10px] border border-black/20 bg-white px-4 py-1.5 text-sm"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {backgroundEditorOpen ? (
        <div className="absolute inset-0 z-[126] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-[760px] rounded-2xl border border-black/30 bg-[rgba(255,255,255,0.92)] p-5 text-[#232629] shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            <div className="mb-3">
              <h3 className="text-lg font-semibold">背景主題設置（雲朵）</h3>
              <p className="mt-1 text-xs text-black/55">即時生效：樣式、數量、速度、大小、透明度，並按主題附加雨/雪/閃電</p>
            </div>

            <div className="mb-4 rounded-xl border border-black/10 bg-white/70 p-3">
              <div className="mb-2 text-sm font-semibold">雲朵樣式</div>
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(CLOUD_THEME_LABELS) as CloudThemeId[]).map((themeId) => (
                  <button
                    key={themeId}
                    type="button"
                    onClick={() => setCloudSettings((prev) => ({ ...prev, themeId }))}
                    className={`rounded-xl border px-1 py-2 text-xs ${
                      cloudSettings.themeId === themeId
                        ? "border-black/80 bg-[rgba(50,50,50,1)] text-white"
                        : "border-black/20 bg-white text-[#232629]"
                    }`}
                  >
                    <span className="flex flex-col items-center gap-1">
                      <span
                        className="h-5 w-10 rounded-full border border-black/15"
                        style={{
                          background:
                            themeId === "sunny"
                              ? "linear-gradient(135deg,#dbe3ef,#9eabbf)"
                              : themeId === "overcast"
                                ? "linear-gradient(135deg,#c5ccd6,#8893a1)"
                                : themeId === "sunset"
                                  ? "linear-gradient(135deg,#ffc08c,#f08a7a)"
                                  : themeId === "cyber"
                                    ? "linear-gradient(135deg,#f2f8ff,#9cb2ce)"
                                    : "linear-gradient(135deg,#aab4c7,#4e5669)",
                        }}
                      />
                      <span className="whitespace-nowrap text-[11px] leading-none">{CLOUD_THEME_LABELS[themeId]}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm">
                數量：{cloudSettings.density}
                <input
                  type="range"
                  min={4}
                  max={16}
                  step={1}
                  value={cloudSettings.density}
                  onChange={(e) =>
                    setCloudSettings((prev) => ({ ...prev, density: Number(e.target.value) }))
                  }
                  className="mt-1 w-full"
                />
              </label>
              <label className="block text-sm">
                速度：{cloudSettings.speed}%
                <input
                  type="range"
                  min={40}
                  max={180}
                  step={1}
                  value={cloudSettings.speed}
                  onChange={(e) => setCloudSettings((prev) => ({ ...prev, speed: Number(e.target.value) }))}
                  className="mt-1 w-full"
                />
              </label>
              <label className="block text-sm">
                大小：{cloudSettings.size}%
                <input
                  type="range"
                  min={70}
                  max={160}
                  step={1}
                  value={cloudSettings.size}
                  onChange={(e) => setCloudSettings((prev) => ({ ...prev, size: Number(e.target.value) }))}
                  className="mt-1 w-full"
                />
              </label>
              <label className="block text-sm">
                透明度：{cloudSettings.opacity}%
                <input
                  type="range"
                  min={20}
                  max={100}
                  step={1}
                  value={cloudSettings.opacity}
                  onChange={(e) => setCloudSettings((prev) => ({ ...prev, opacity: Number(e.target.value) }))}
                  className="mt-1 w-full"
                />
              </label>
              <label className="block text-sm">
                天氣頻率：{cloudSettings.weatherFrequency}%
                <input
                  type="range"
                  min={40}
                  max={180}
                  step={1}
                  value={cloudSettings.weatherFrequency}
                  onChange={(e) =>
                    setCloudSettings((prev) => ({ ...prev, weatherFrequency: Number(e.target.value) }))
                  }
                  className="mt-1 w-full"
                />
              </label>
              <label className="block text-sm">
                天氣大小：{cloudSettings.weatherSize}%
                <input
                  type="range"
                  min={60}
                  max={170}
                  step={1}
                  value={cloudSettings.weatherSize}
                  onChange={(e) => setCloudSettings((prev) => ({ ...prev, weatherSize: Number(e.target.value) }))}
                  className="mt-1 w-full"
                />
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-black/10 bg-white/70 p-3">
              <div className="mb-2 text-sm font-semibold">進階效果（雲層動態強度）</div>
              <div className="flex items-center gap-2">
                {(["low", "medium", "high"] as CloudFxLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setCloudSettings((prev) => ({ ...prev, fxLevel: level }))}
                    className={`rounded-[10px] border px-4 py-1.5 text-sm ${
                      cloudSettings.fxLevel === level
                        ? "border-black/80 bg-[rgba(50,50,50,1)] text-white"
                        : "border-black/20 bg-white text-[#232629]"
                    }`}
                  >
                    {CLOUD_FX_LABELS[level]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCloudSettings(DEFAULT_CLOUD_SETTINGS)}
                className="rounded-[10px] border border-black/20 bg-white px-4 py-1.5 text-sm text-[#232629]"
              >
                恢復全部預設
              </button>
              <button
                type="button"
                onClick={() => setBackgroundEditorOpen(false)}
                className="rounded-[10px] border border-black/20 bg-white px-4 py-1.5 text-sm"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {historyOpen ? (
        <div className="absolute inset-0 z-[126] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-[760px] rounded-2xl border border-black/30 bg-[rgba(255,255,255,0.92)] p-5 text-[#232629] shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">對戰歷史記錄</h3>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="rounded-[10px] border border-black/20 bg-white px-4 py-1.5 text-sm"
              >
                關閉
              </button>
            </div>
            <p className="mb-3 text-xs text-black/60">僅記錄完整一局（5/10/15 分）結束後的結果。</p>
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {matchHistory.length === 0 ? (
                <div className="rounded-xl border border-black/10 bg-white/70 p-4 text-sm text-black/55">暫無記錄</div>
              ) : (
                matchHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-black/10 bg-white/75 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <NextImage
                        src={item.themePreviewSrc}
                        alt={THEME_DISPLAY_NAME[item.themeId]}
                        width={36}
                        height={36}
                        unoptimized
                        className="h-9 w-9 rounded-full border border-black/15 object-cover"
                      />
                      <div className="text-sm">
                        <div className="font-semibold">
                          玩家1 {item.p1Score} : {item.p2Score} 玩家2
                        </div>
                        <div className="text-xs text-black/60">
                          {new Date(item.createdAt).toLocaleString("zh-TW", { hour12: false })} | 難度 {DIFFICULTY_LABELS[item.difficulty]} |
                          目標 {item.winningScore} 分 | 球 {THEME_DISPLAY_NAME[item.themeId]}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-black/45">{item.synced ? "已同步" : "本地"}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
