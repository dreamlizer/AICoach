"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import {
  WINLINEZ_BOARD_SIZE,
  WINLINEZ_COLORS,
  calculateMoveScore,
  clearCells,
  createEmptyBoard,
  findLineMatches,
  findPath,
  findReachableEmptyKeys,
  generatePreviewPieces,
  getEmptyPositions,
  movePiece,
  positionKey,
  spawnPreviewPieces,
  summarizeWinlinezRecords,
  type WinlinezBoard,
  type WinlinezGameRecord,
  type WinlinezGameSummary,
  type WinlinezPosition,
} from "@/lib/winlinez";
import { createWinlinezCommentary, createWinlinezGameOverMessage } from "@/lib/winlinez-commentary";
import { WinlinezSettingsMenu } from "@/app/components/winlinez/WinlinezSettingsMenu";
import { WinlinezLeaderboardModal, type WinlinezLeaderboardRow } from "@/app/components/winlinez/WinlinezLeaderboardModal";

type WinLinezWorkbenchProps = { onClose: () => void };
type SpeedPreset = "slow" | "normal" | "fast";
type MoveMode = "path" | "blink";
type ThemeId = "retro" | "neon" | "frost" | "nova";
type AidLevel = "none" | "assist" | "boost";
type ToolStock = { clearRandom: number; shuffle: number; rerollPreview: number; clearTarget: number };
type RoundToolUsage = { clearRandom: number; shuffle: number; rerollPreview: number; clearTarget: number };
type MovementState = { fromKey: string; colorIndex: number; path: WinlinezPosition[]; step: number };
type BurstItem = { key: string; colorIndex: number };
type WinlinezAchievements = { line5: number; line6: number; line7: number; line8: number };
type SavedGameState = {
  board: WinlinezBoard;
  preview: ReturnType<typeof generatePreviewPieces>;
  score: number;
  movesPlayed: number;
  linesCleared: number;
  ballsCleared: number;
  statusText: string;
  speedPreset: SpeedPreset;
  moveMode: MoveMode;
  themeId: ThemeId;
  aidLevel: AidLevel;
  toolStock: ToolStock;
  toolUsage: RoundToolUsage;
  targetClearArmed: boolean;
  isGameOver: boolean;
};

const LOCAL_HISTORY_KEY = "winlinez-local-history";
const LOCAL_HISTORY_SYNC_KEY = "winlinez-local-history-sync";
const LOCAL_ACHIEVEMENTS_KEY = "winlinez-local-achievements";
const LOCAL_GAME_STATE_KEY = "winlinez-local-active-game-v1";
const MAX_LOCAL_HISTORY = 1000;
const WINDOW_WIDTH = 1210;
const BOARD_GAP = 2;
const BOARD_INSET = 6;
const SPEED_MS: Record<SpeedPreset, number> = { slow: 95, normal: 70, fast: 45 };
const TOOL_STOCK: Record<AidLevel, ToolStock> = {
  none: { clearRandom: 0, shuffle: 0, rerollPreview: 0, clearTarget: 0 },
  assist: { clearRandom: 2, shuffle: 1, rerollPreview: 2, clearTarget: 1 },
  boost: { clearRandom: 4, shuffle: 2, rerollPreview: 4, clearTarget: 2 },
};
const THEMES: Record<ThemeId, { label: string; windowBg: string; titleBg: string; boardBg: string; cellBg: string; panelBg: string; panelText: string }> = {
  retro: { label: "复古", windowBg: "#d4d4d4", titleBg: "linear-gradient(90deg,#111 0%,#909aa5 100%)", boardBg: "#a8a8a8", cellBg: "#bebebe", panelBg: "#000", panelText: "#fff" },
  neon: { label: "霓虹", windowBg: "#1a1f35", titleBg: "linear-gradient(90deg,#111827 0%,#0f766e 45%,#312e81 100%)", boardBg: "#10202a", cellBg: "#1a2d3b", panelBg: "#07111e", panelText: "#e2f9ff" },
  frost: { label: "冰晶", windowBg: "#dbe7f1", titleBg: "linear-gradient(90deg,#364a5e 0%,#6ea5c9 100%)", boardBg: "#c7d7e5", cellBg: "#dde8f1", panelBg: "#172433", panelText: "#f8fbff" },
  nova: { label: "新星", windowBg: "#291e3f", titleBg: "linear-gradient(90deg,#220f46 0%,#5b21b6 45%,#ef4444 100%)", boardBg: "#3a2a50", cellBg: "#4a345f", panelBg: "#140f1f", panelText: "#ffe9ff" },
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}
function createUsage(): RoundToolUsage {
  return { clearRandom: 0, shuffle: 0, rerollPreview: 0, clearTarget: 0 };
}
function randomPick<T>(source: T[], count: number): T[] {
  const pool = [...source];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}
function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function clearRandomRange(level: AidLevel) {
  return level === "boost" ? "3~5" : "2~3";
}
function countOccupied(board: WinlinezBoard) {
  let c = 0;
  board.forEach((row) => row.forEach((cell) => cell && (c += 1)));
  return c;
}
function boardSignature(board: WinlinezBoard) {
  return board.map((r) => r.map((c) => (c ? c.colorIndex : "-")).join(",")).join("|");
}
function readLocal(): { history: WinlinezGameRecord[]; summary: WinlinezGameSummary } {
  if (typeof window === "undefined") return { history: [], summary: summarizeWinlinezRecords([]) };
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as { history?: WinlinezGameRecord[]; summary?: WinlinezGameSummary }) : {};
    const history = Array.isArray(parsed.history) ? parsed.history : [];
    return { history, summary: parsed.summary || summarizeWinlinezRecords(history) };
  } catch {
    return { history: [], summary: summarizeWinlinezRecords([]) };
  }
}
function writeLocal(history: WinlinezGameRecord[]) {
  if (typeof window !== "undefined") localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify({ history, summary: summarizeWinlinezRecords(history) }));
}
function localRecordKey(record: WinlinezGameRecord) {
  return [record.created_at || "", record.score, record.linesCleared, record.ballsCleared, record.movesPlayed, record.aidLevel || "none"].join("|");
}
function readLocalSyncMeta(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_SYNC_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function writeLocalSyncMeta(meta: Record<string, string>) {
  if (typeof window !== "undefined") localStorage.setItem(LOCAL_HISTORY_SYNC_KEY, JSON.stringify(meta));
}
function historySignature(history: WinlinezGameRecord[]) {
  return history.map(localRecordKey).join(";");
}
function readAchievements(): WinlinezAchievements {
  if (typeof window === "undefined") return { line5: 0, line6: 0, line7: 0, line8: 0 };
  try {
    const raw = localStorage.getItem(LOCAL_ACHIEVEMENTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<WinlinezAchievements>) : {};
    return {
      line5: Number.isFinite(Number(parsed.line5)) ? Number(parsed.line5) : 0,
      line6: Number.isFinite(Number(parsed.line6)) ? Number(parsed.line6) : 0,
      line7: Number.isFinite(Number(parsed.line7)) ? Number(parsed.line7) : 0,
      line8: Number.isFinite(Number(parsed.line8)) ? Number(parsed.line8) : 0,
    };
  } catch {
    return { line5: 0, line6: 0, line7: 0, line8: 0 };
  }
}
function writeAchievements(value: WinlinezAchievements) {
  if (typeof window !== "undefined") localStorage.setItem(LOCAL_ACHIEVEMENTS_KEY, JSON.stringify(value));
}
function isValidPiece(cell: unknown): cell is { id: string; colorIndex: number } {
  if (!cell || typeof cell !== "object") return false;
  const c = cell as { id?: unknown; colorIndex?: unknown };
  return typeof c.id === "string" && Number.isInteger(c.colorIndex) && Number(c.colorIndex) >= 0 && Number(c.colorIndex) < WINLINEZ_COLORS.length;
}
function isValidBoard(value: unknown): value is WinlinezBoard {
  if (!Array.isArray(value) || value.length !== WINLINEZ_BOARD_SIZE) return false;
  return value.every((row) => Array.isArray(row) && row.length === WINLINEZ_BOARD_SIZE && row.every((cell) => cell === null || isValidPiece(cell)));
}
function isValidPreview(value: unknown): value is ReturnType<typeof generatePreviewPieces> {
  return Array.isArray(value) && value.length === 3 && value.every((piece) => isValidPiece(piece));
}
function readSavedGame(): SavedGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_GAME_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedGameState>;
    if (!isValidBoard(parsed.board) || !isValidPreview(parsed.preview)) return null;
    if (countOccupied(parsed.board) <= 0) return null;
    const aidLevel: AidLevel = parsed.aidLevel === "assist" || parsed.aidLevel === "boost" ? parsed.aidLevel : "none";
    const speedPreset: SpeedPreset = parsed.speedPreset === "slow" || parsed.speedPreset === "fast" ? parsed.speedPreset : "normal";
    const moveMode: MoveMode = parsed.moveMode === "blink" ? "blink" : "path";
    const themeId: ThemeId = parsed.themeId === "neon" || parsed.themeId === "frost" || parsed.themeId === "nova" ? parsed.themeId : "retro";
    const safeToolStock: ToolStock = {
      clearRandom: Math.max(0, Number(parsed.toolStock?.clearRandom || 0)),
      shuffle: Math.max(0, Number(parsed.toolStock?.shuffle || 0)),
      rerollPreview: Math.max(0, Number(parsed.toolStock?.rerollPreview || 0)),
      clearTarget: Math.max(0, Number(parsed.toolStock?.clearTarget || 0)),
    };
    const safeToolUsage: RoundToolUsage = {
      clearRandom: Math.max(0, Number(parsed.toolUsage?.clearRandom || 0)),
      shuffle: Math.max(0, Number(parsed.toolUsage?.shuffle || 0)),
      rerollPreview: Math.max(0, Number(parsed.toolUsage?.rerollPreview || 0)),
      clearTarget: Math.max(0, Number(parsed.toolUsage?.clearTarget || 0)),
    };
    return {
      board: parsed.board,
      preview: parsed.preview,
      score: Math.max(0, Number(parsed.score || 0)),
      movesPlayed: Math.max(0, Number(parsed.movesPlayed || 0)),
      linesCleared: Math.max(0, Number(parsed.linesCleared || 0)),
      ballsCleared: Math.max(0, Number(parsed.ballsCleared || 0)),
      statusText: typeof parsed.statusText === "string" && parsed.statusText.trim() ? parsed.statusText : "已恢复上次进度。",
      speedPreset,
      moveMode,
      themeId,
      aidLevel,
      toolStock: safeToolStock,
      toolUsage: safeToolUsage,
      targetClearArmed: Boolean(parsed.targetClearArmed),
      isGameOver: Boolean(parsed.isGameOver),
    };
  } catch {
    return null;
  }
}
function clearSavedGame() {
  if (typeof window !== "undefined") localStorage.removeItem(LOCAL_GAME_STATE_KEY);
}
function writeSavedGame(snapshot: SavedGameState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_GAME_STATE_KEY, JSON.stringify(snapshot));
}
function formatRecordTime(v: string) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function aidLabel(level?: AidLevel) {
  if (level === "assist") return "1档道具";
  if (level === "boost") return "2档道具";
  return "0档道具";
}
function mixHex(baseHex: string, targetHex: string, amount: number) {
  const base = baseHex.replace("#", "");
  const target = targetHex.replace("#", "");
  const br = Number.parseInt(base.slice(0, 2), 16);
  const bg = Number.parseInt(base.slice(2, 4), 16);
  const bb = Number.parseInt(base.slice(4, 6), 16);
  const tr = Number.parseInt(target.slice(0, 2), 16);
  const tg = Number.parseInt(target.slice(2, 4), 16);
  const tb = Number.parseInt(target.slice(4, 6), 16);
  const r = Math.round(br + (tr - br) * amount);
  const g = Math.round(bg + (tg - bg) * amount);
  const b = Math.round(bb + (tb - bb) * amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
function pieceStyle(colorIndex: number, size: number, themeId: ThemeId): CSSProperties {
  const raw = WINLINEZ_COLORS[colorIndex]?.hex || "#ff0000";
  const base = themeId === "retro" ? raw : mixHex(raw, "#ffffff", 0.08);
  return {
    width: size,
    height: size,
    borderRadius: 9999,
    backgroundImage: `radial-gradient(circle at 31% 27%, ${mixHex(base, "#ffffff", 0.46)} 0 10%, ${mixHex(base, "#ffffff", 0.1)} 42%, ${mixHex(base, "#000000", 0.4)} 77%, ${mixHex(base, "#000000", 0.65)} 100%),radial-gradient(circle at 38% 30%, rgba(255,255,255,0.35) 0 14%, transparent 14% 100%)`,
    border: `1px solid ${mixHex(base, "#000000", 0.6)}`,
    boxShadow: `inset 0 1px 0 ${mixHex(base, "#ffffff", 0.52)},inset -2px -2px 3px ${mixHex(base, "#000000", 0.32)},0 1px 0 #1a1a1a`,
  };
}
const KING_FRAME_X = [2, 75, 148, 221, 294, 367, 440];
const KING_FRAME_W = 70;
const KING_FRAME_H = 108;
const KING_LEFT_Y = 0;
const KING_RIGHT_Y = 102;
const KING_RIGHT_FRAME_X = [2, 75, 148, 221, 294];
const KING_RIGHT_FRAME_H = 63;
const KING_SCORE_STEPS = [0, 10, 25, 45, 70, 100, 140];
function getKingFrameIndex(score: number, frameCount = KING_FRAME_X.length) {
  let idx = 0;
  for (let i = 0; i < KING_SCORE_STEPS.length; i += 1) {
    if (score >= KING_SCORE_STEPS[i]) idx = i;
  }
  return Math.min(idx, frameCount - 1);
}
function KingAvatar({ side, score, themeId }: { side: "left" | "right"; score: number; themeId: ThemeId }) {
  if (themeId === "retro") {
    const rightSide = side === "right";
    const xFrames = KING_FRAME_X;
    const frame = getKingFrameIndex(score, xFrames.length);
    const x = xFrames[frame];
    const y = KING_LEFT_Y;
    return (
      <div className="-mb-[8px] h-[124px] w-[96px] overflow-hidden relative">
        {rightSide ? <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[28px] bg-black" /> : null}
        <div
          style={{
            width: `${KING_FRAME_W}px`,
            height: `${KING_FRAME_H}px`,
            backgroundImage: rightSide ? "url('/winlinez/right-king-complete.png')" : "url('/winlinez/1111.bmp')",
            backgroundPosition: rightSide ? "0 0" : `-${x}px -${y}px`,
            backgroundRepeat: "no-repeat",
            imageRendering: "pixelated",
            transform: `translateX(${side === "left" ? 6 : 0}px) scale(1.28)`,
            transformOrigin: "top left",
          }}
        />
      </div>
    );
  }
  const color = side === "left" ? "#db2b2b" : "#d339d3";
  return (
    <svg width="96" height="112" viewBox="0 0 96 112" aria-hidden="true">
      <ellipse cx="48" cy="64" rx="24" ry="22" fill={color} />
      <circle cx="48" cy="52" r="10" fill="#f0c49b" />
      <path d="M32 41 L40 30 L48 37 L56 30 L64 41 Z" fill="#f4de41" />
    </svg>
  );
}
function Pillar() {
  return <div className="h-[220px] w-[54px] bg-[linear-gradient(90deg,#4f4f4f_0%,#d8d8d8_24%,#fbfbfb_50%,#d3d3d3_76%,#5a5a5a_100%)]" />;
}

export function WinLinezWorkbench({ onClose }: WinLinezWorkbenchProps) {
  const { user } = useAuth();
  const [board, setBoard] = useState<WinlinezBoard>(createEmptyBoard);
  const [preview, setPreview] = useState(generatePreviewPieces);
  const [selected, setSelected] = useState<WinlinezPosition | null>(null);
  const [score, setScore] = useState(0);
  const [movesPlayed, setMovesPlayed] = useState(0);
  const [linesCleared, setLinesCleared] = useState(0);
  const [ballsCleared, setBallsCleared] = useState(0);
  const [statusText, setStatusText] = useState("棋盘就绪。");
  const [history, setHistory] = useState<WinlinezGameRecord[]>([]);
  const [summary, setSummary] = useState<WinlinezGameSummary>({ bestScore: 0, lastScore: 0, totalPlays: 0, averageScore: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentaryEnabled, setCommentaryEnabled] = useState(true);
  const [speedPreset, setSpeedPreset] = useState<SpeedPreset>("normal");
  const [moveMode, setMoveMode] = useState<MoveMode>("path");
  const [themeId, setThemeId] = useState<ThemeId>("retro");
  const [aidLevel, setAidLevel] = useState<AidLevel>("none");
  const [toolStock, setToolStock] = useState<ToolStock>(TOOL_STOCK.none);
  const [toolUsage, setToolUsage] = useState<RoundToolUsage>(createUsage);
  const [targetClearArmed, setTargetClearArmed] = useState(false);
  const [movement, setMovement] = useState<MovementState | null>(null);
  const [showReachableHint, setShowReachableHint] = useState(false);
  const [showPathPreview, setShowPathPreview] = useState(false);
  const [hoverTarget, setHoverTarget] = useState<WinlinezPosition | null>(null);
  const [burstItems, setBurstItems] = useState<BurstItem[]>([]);
  const [showRoundSummary, setShowRoundSummary] = useState(false);
  const [roundSummaryText, setRoundSummaryText] = useState("");
  const [achievements, setAchievements] = useState<WinlinezAchievements>({ line5: 0, line6: 0, line7: 0, line8: 0 });
  const [showHelp, setShowHelp] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardAid, setLeaderboardAid] = useState<AidLevel>("none");
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardRows, setLeaderboardRows] = useState<WinlinezLeaderboardRow[]>([]);
  const [viewportWidth, setViewportWidth] = useState(1280);
  const [viewportHeight, setViewportHeight] = useState(920);
  const [isGameOver, setIsGameOver] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);
  const toolStockRef = useRef<ToolStock>(toolStock);
  const saveSigRef = useRef("");
  const achievementsRef = useRef<WinlinezAchievements>({ line5: 0, line6: 0, line7: 0, line8: 0 });
  const dryStreakRef = useRef(0);
  const hotStreakRef = useRef(0);
  const restoringAidRef = useRef(false);

  const isCompact = viewportWidth < 1080;
  const currentTheme = THEMES[themeId];
  const bestScore = summary.bestScore || 0;
  const bestScoreDisplay = Math.max(bestScore, score);
  const menuRecent = useMemo(() => history.slice(0, 5), [history]);
  const boardCell = useMemo(() => {
    const shellWidth = Math.min(WINDOW_WIDTH, viewportWidth - 12);
    const widthBudget = isCompact ? shellWidth - 24 : shellWidth - 278 - 278 - 32;
    const widthCell = Math.floor((widthBudget - BOARD_INSET * 2 - BOARD_GAP * (WINLINEZ_BOARD_SIZE - 1)) / WINLINEZ_BOARD_SIZE);
    const boardHeightBudget = viewportHeight - (38 + 38 + 88) - (isCompact ? 56 : 22);
    const heightCell = Math.floor((boardHeightBudget - BOARD_INSET * 2 - BOARD_GAP * (WINLINEZ_BOARD_SIZE - 1)) / WINLINEZ_BOARD_SIZE);
    return Math.max(isCompact ? 20 : 34, Math.min(widthCell, heightCell, 72));
  }, [isCompact, viewportHeight, viewportWidth]);
  const ballSize = Math.round(boardCell * 0.76);
  const previewSize = isCompact ? 27 : 34;
  const previewBoxSize = isCompact ? 46 : 58;
  const clearRangeLabel = clearRandomRange(aidLevel);
  const movingPos = movement ? movement.path[movement.step] : null;
  const movingX = movingPos ? BOARD_INSET + movingPos.col * (boardCell + BOARD_GAP) + (boardCell - ballSize) / 2 : 0;
  const movingY = movingPos ? BOARD_INSET + movingPos.row * (boardCell + BOARD_GAP) + 4 : 0;
  const reachable = useMemo(() => (!showReachableHint || !selected || targetClearArmed || movement || isGameOver ? new Set<string>() : findReachableEmptyKeys(board, selected)), [board, isGameOver, movement, selected, showReachableHint, targetClearArmed]);
  const previewPath = useMemo(() => {
    if (!showPathPreview || !selected || !hoverTarget || targetClearArmed || movement || isGameOver) return null;
    if (board[hoverTarget.row][hoverTarget.col]) return null;
    const path = findPath(board, selected, hoverTarget);
    return path && path.length >= 2 ? path : null;
  }, [board, hoverTarget, isGameOver, movement, selected, showPathPreview, targetClearArmed]);
  const pathKeys = useMemo(() => new Set((previewPath || []).map(positionKey)), [previewPath]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    toolStockRef.current = toolStock;
  }, [toolStock]);
  useEffect(() => {
    achievementsRef.current = achievements;
  }, [achievements]);
  useEffect(() => {
    const onResize = () => {
      const cssViewportWidth = Math.min(
        window.innerWidth,
        document.documentElement?.clientWidth || window.innerWidth
      );
      setViewportWidth(cssViewportWidth);
      setViewportHeight(window.innerHeight);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const loadLeaderboard = async (aid: AidLevel) => {
    setLeaderboardLoading(true);
    try {
      const response = (await apiClient.winlinez.leaderboard({ aidLevel: aid, limit: 10 })) as {
        leaderboard?: WinlinezLeaderboardRow[];
      };
      setLeaderboardRows(Array.isArray(response.leaderboard) ? response.leaderboard : []);
    } catch (error) {
      console.error("Failed to load winlinez leaderboard:", error);
      setLeaderboardRows([]);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const openLeaderboardModal = () => {
    setShowLeaderboard(true);
    void loadLeaderboard(leaderboardAid);
  };

  const changeLeaderboardAid = (aid: AidLevel) => {
    setLeaderboardAid(aid);
    void loadLeaderboard(aid);
  };
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const local = readLocal();
      if (user) {
        try {
          let data = (await apiClient.winlinez.scores()) as { history?: WinlinezGameRecord[]; summary?: WinlinezGameSummary | null };
          const localHistory = local.history || [];
          if (localHistory.length) {
            const syncMeta = readLocalSyncMeta();
            const sig = historySignature(localHistory);
            const syncKey = `user-${user.id}`;
            if (syncMeta[syncKey] !== sig) {
              const serverKeys = new Set((Array.isArray(data.history) ? data.history : []).map(localRecordKey));
              const missing = localHistory.filter((r) => !serverKeys.has(localRecordKey(r)));
              if (missing.length) {
                for (const record of missing) {
                  try {
                    await apiClient.winlinez.saveScore({
                      score: record.score,
                      linesCleared: record.linesCleared,
                      ballsCleared: record.ballsCleared,
                      movesPlayed: record.movesPlayed,
                      pieceStyle: record.pieceStyle || "orb",
                      metadata: {
                        aidLevel: record.aidLevel || "none",
                        speedPreset: record.speedPreset,
                        themeId: record.themeId,
                        toolUsage: record.toolUsage,
                        durationSec: record.durationSec || 0,
                      },
                    });
                  } catch {}
                }
                data = (await apiClient.winlinez.scores()) as { history?: WinlinezGameRecord[]; summary?: WinlinezGameSummary | null };
              }
              syncMeta[syncKey] = sig;
              writeLocalSyncMeta(syncMeta);
            }
          }
          if (!active) return;
          setHistory(Array.isArray(data.history) ? data.history : []);
          setSummary(data.summary || summarizeWinlinezRecords([]));
          return;
        } catch {}
      }
      if (!active) return;
      setHistory(local.history);
      setSummary(local.summary);
    };
    load();
    return () => {
      active = false;
    };
  }, [user]);
  useEffect(() => {
    const localAchievement = readAchievements();
    setAchievements(localAchievement);
    achievementsRef.current = localAchievement;
  }, []);

  const startNewGame = () => {
    clearSavedGame();
    const spawned = spawnPreviewPieces(createEmptyBoard(), generatePreviewPieces());
    setBoard(spawned.board);
    setPreview(generatePreviewPieces());
    setSelected(null);
    setScore(0);
    setMovesPlayed(0);
    setLinesCleared(0);
    setBallsCleared(0);
    setStatusText("棋盘就绪。");
    setToolStock({ ...TOOL_STOCK[aidLevel] });
    setToolUsage(createUsage());
    setTargetClearArmed(false);
    setMovement(null);
    setBurstItems([]);
    setIsGameOver(false);
    setShowRoundSummary(false);
    setRoundSummaryText("");
    saveSigRef.current = "";
    dryStreakRef.current = 0;
    hotStreakRef.current = 0;
  };
  useEffect(() => {
    const saved = readSavedGame();
    if (!saved) {
      startNewGame();
      return;
    }
    restoringAidRef.current = true;
    setBoard(saved.board);
    setPreview(saved.preview);
    setSelected(null);
    setScore(saved.score);
    setMovesPlayed(saved.movesPlayed);
    setLinesCleared(saved.linesCleared);
    setBallsCleared(saved.ballsCleared);
    setStatusText(saved.statusText || "已恢复上次进度。");
    setSpeedPreset(saved.speedPreset);
    setMoveMode(saved.moveMode);
    setThemeId(saved.themeId);
    setAidLevel(saved.aidLevel);
    setToolStock(saved.toolStock);
    setToolUsage(saved.toolUsage);
    setTargetClearArmed(saved.targetClearArmed);
    setMovement(null);
    setBurstItems([]);
    setIsGameOver(saved.isGameOver);
    setShowRoundSummary(false);
    setRoundSummaryText("");
  }, []); // eslint-disable-line
  useEffect(() => {
    if (restoringAidRef.current) {
      restoringAidRef.current = false;
      return;
    }
    setToolStock({ ...TOOL_STOCK[aidLevel] });
    setTargetClearArmed(false);
  }, [aidLevel]);
  useEffect(() => { if (!burstItems.length) return; const t = window.setTimeout(() => setBurstItems([]), 420); return () => window.clearTimeout(t); }, [burstItems]);
  useEffect(() => {
    if (movement) return;
    if (isGameOver) {
      clearSavedGame();
      return;
    }
    if (
      countOccupied(board) <= 0 &&
      score === 0 &&
      movesPlayed === 0 &&
      linesCleared === 0 &&
      ballsCleared === 0
    ) {
      return;
    }
    writeSavedGame({
      board,
      preview,
      score,
      movesPlayed,
      linesCleared,
      ballsCleared,
      statusText,
      speedPreset,
      moveMode,
      themeId,
      aidLevel,
      toolStock,
      toolUsage,
      targetClearArmed,
      isGameOver,
    });
  }, [aidLevel, ballsCleared, board, isGameOver, linesCleared, moveMode, movesPlayed, movement, preview, score, speedPreset, statusText, targetClearArmed, themeId, toolStock, toolUsage]);

  useEffect(() => {
    if (!isGameOver) return;
    const sig = `${score}-${movesPlayed}-${linesCleared}-${ballsCleared}-${aidLevel}`;
    if (saveSigRef.current === sig) return;
    saveSigRef.current = sig;
    const record: WinlinezGameRecord = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, score, linesCleared, ballsCleared, movesPlayed, pieceStyle: "orb", aidLevel, durationSec: 0, speedPreset, themeId, toolUsage: { ...toolUsage }, created_at: new Date().toISOString() };
    const persist = async () => {
      const local = readLocal();
      const nextLocalHistory = [record, ...local.history].slice(0, MAX_LOCAL_HISTORY);
      writeLocal(nextLocalHistory);
      if (user) {
        try {
          const r = (await apiClient.winlinez.saveScore({ score, linesCleared, ballsCleared, movesPlayed, pieceStyle: "orb", metadata: { aidLevel, speedPreset, themeId, toolUsage } })) as { record?: WinlinezGameRecord; summary?: WinlinezGameSummary | null };
          const next = r.record || record;
          setHistory((prev) => [next, ...prev].slice(0, 20));
          setSummary(r.summary || summarizeWinlinezRecords([next, ...history]));
          return;
        } catch {}
      }
      setHistory(nextLocalHistory);
      setSummary(summarizeWinlinezRecords(nextLocalHistory));
    };
    persist();
  }, [aidLevel, ballsCleared, history, isGameOver, linesCleared, movesPlayed, score, speedPreset, themeId, toolUsage, user]);

  const consumeTool = (key: keyof ToolStock) => {
    if (toolStockRef.current[key] <= 0) return false;
    setToolStock((prev) => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }));
    setToolUsage((prev) => ({ ...prev, [key]: prev[key] + 1 }));
    toolStockRef.current = { ...toolStockRef.current, [key]: Math.max(0, toolStockRef.current[key] - 1) };
    return true;
  };
  const registerAchievementByRemoved = (removed: number) => {
    const bucket = Math.min(8, removed);
    if (bucket < 5) return;
    const key = (`line${bucket}` as keyof WinlinezAchievements);
    if (!["line5", "line6", "line7", "line8"].includes(key)) return;
    const next: WinlinezAchievements = { ...achievementsRef.current, [key]: (achievementsRef.current[key] || 0) + 1 };
    achievementsRef.current = next;
    setAchievements(next);
    writeAchievements(next);
  };

  const applyLineClear = (source: WinlinezBoard) => {
    const match = findLineMatches(source);
    if (!match.uniqueCells.length) return { board: source, scoreDelta: 0, lines: 0, removed: 0 };
    setBurstItems(match.uniqueCells.map((p) => ({ key: positionKey(p), colorIndex: source[p.row][p.col]?.colorIndex || 0 })));
    registerAchievementByRemoved(match.uniqueCells.length);
    return { board: clearCells(source, match.uniqueCells), scoreDelta: calculateMoveScore(match.uniqueCells.length, match.lines.length), lines: match.lines.length, removed: match.uniqueCells.length };
  };

  const resolveTurnAfterMove = (moved: WinlinezBoard, nextPreview: ReturnType<typeof generatePreviewPieces>) => {
    const first = applyLineClear(moved);
    setMovesPlayed((p) => p + 1);
    if (first.removed > 0) {
      hotStreakRef.current += 1;
      dryStreakRef.current = 0;
      setScore((p) => p + first.scoreDelta);
      setLinesCleared((p) => p + first.lines);
      setBallsCleared((p) => p + first.removed);
      setStatusText(
        commentaryEnabled
          ? createWinlinezCommentary("moveScore", {
              score: first.scoreDelta,
              lines: first.lines,
              cleared: first.removed,
              hotStreak: hotStreakRef.current,
              dryStreak: dryStreakRef.current,
            })
          : `本回合得分 +${first.scoreDelta}`,
      );
      setBoard(first.board);
      setPreview(nextPreview);
      return;
    }
    const spawned = spawnPreviewPieces(moved, nextPreview);
    const second = applyLineClear(spawned.board);
    const generated = generatePreviewPieces();
    if (second.removed > 0) {
      hotStreakRef.current += 1;
      dryStreakRef.current = 0;
      setScore((p) => p + second.scoreDelta);
      setLinesCleared((p) => p + second.lines);
      setBallsCleared((p) => p + second.removed);
      setStatusText(
        commentaryEnabled
          ? createWinlinezCommentary("moveScore", {
              score: second.scoreDelta,
              lines: second.lines,
              cleared: second.removed,
              hotStreak: hotStreakRef.current,
              dryStreak: dryStreakRef.current,
            })
          : `本回合得分 +${second.scoreDelta}`,
      );
      setBoard(second.board);
      setPreview(generated);
      return;
    }
    dryStreakRef.current += 1;
    hotStreakRef.current = 0;
    const over = getEmptyPositions(spawned.board).length === 0 || spawned.gameOver;
    setBoard(spawned.board);
    setPreview(generated);
    setIsGameOver(over);
    setStatusText(
      over
        ? "本局结束。"
        : commentaryEnabled
        ? createWinlinezCommentary("nextDrop", { dryStreak: dryStreakRef.current })
        : "下一组三球已落下。",
    );
    if (over) {
      const finalPlays = (summary.totalPlays || 0) + 1;
      const finalScore = score;
      setRoundSummaryText(
        createWinlinezGameOverMessage({
          score: finalScore,
          totalPlays: finalPlays,
          isNewBest: finalScore > (summary.bestScore || 0),
        }),
      );
      setShowRoundSummary(true);
    }
  };

  const useClearRandomTool = () => {
    if (isGameOver || movement) return;
    const occupied: WinlinezPosition[] = [];
    board.forEach((row, r) => row.forEach((cell, c) => cell && occupied.push({ row: r, col: c })));
    if (occupied.length <= 1) return setStatusText("至少保留 1 个球，无法继续消除。");
    if (!consumeTool("clearRandom")) return setStatusText("没有可用的随机消除道具。");
    const removeRaw = aidLevel === "boost" ? randomBetween(3, 5) : randomBetween(2, 3);
    const removeCount = Math.min(removeRaw, occupied.length - 1);
    const picked = randomPick(occupied, removeCount);
    const next = board.map((r) => [...r]);
    picked.forEach((p) => (next[p.row][p.col] = null));
    setBoard(next);
    setBurstItems(picked.map((p) => ({ key: positionKey(p), colorIndex: board[p.row][p.col]?.colorIndex || 0 })));
    setBallsCleared((p) => p + picked.length);
    setStatusText(commentaryEnabled ? createWinlinezCommentary("randomClear", { cleared: picked.length }) : `已随机消除 ${picked.length} 个球。`);
  };
  const useShuffleTool = () => {
    if (isGameOver || movement) return;
    const pieces: { id: string; colorIndex: number }[] = [];
    board.forEach((row) => row.forEach((cell) => cell && pieces.push(cell)));
    if (pieces.length < 2) return setStatusText("当前棋子太少，无法洗牌。");
    if (!consumeTool("shuffle")) return setStatusText("没有可用的洗牌道具。");
    const all: WinlinezPosition[] = [];
    for (let r = 0; r < WINLINEZ_BOARD_SIZE; r += 1) for (let c = 0; c < WINLINEZ_BOARD_SIZE; c += 1) all.push({ row: r, col: c });
    const sig = boardSignature(board);
    let shuffled = createEmptyBoard();
    let retry = 0;
    do {
      shuffled = createEmptyBoard();
      const pos = randomPick(all, pieces.length);
      const values = randomPick(pieces, pieces.length);
      pos.forEach((p, i) => (shuffled[p.row][p.col] = values[i]));
      retry += 1;
    } while (retry < 10 && boardSignature(shuffled) === sig);
    setBoard(shuffled);
    setStatusText(commentaryEnabled ? createWinlinezCommentary("shuffle") : "棋盘已洗牌。");
  };
  const useRerollPreviewTool = () => {
    if (isGameOver || movement) return;
    if (!consumeTool("rerollPreview")) return setStatusText("没有可用的刷新道具。");
    setPreview(generatePreviewPieces());
    setStatusText(commentaryEnabled ? createWinlinezCommentary("rerollPreview") : "下组预览已刷新。");
  };
  const armTargetClearTool = () => {
    if (isGameOver || movement) return;
    if (countOccupied(board) <= 1) return setStatusText("至少保留 1 个球，无法继续消除。");
    if (toolStockRef.current.clearTarget <= 0) return setStatusText("没有可用的精准清除道具。");
    setTargetClearArmed(true);
    setStatusText("请选择一颗棋子进行精准清除。");
  };

  const handleCellClick = async (row: number, col: number) => {
    if (isGameOver || movement) return;
    const piece = board[row][col];
    const target = { row, col };
    if (targetClearArmed) {
      if (!piece) return setStatusText("请选择一颗棋子进行精准清除。");
      if (countOccupied(board) <= 1) return setStatusText("至少保留 1 个球，无法继续消除。");
      if (!consumeTool("clearTarget")) return setStatusText("没有可用的精准清除道具。");
      const next = board.map((r) => [...r]);
      next[row][col] = null;
      setBoard(next);
      setTargetClearArmed(false);
      setBallsCleared((p) => p + 1);
      return setStatusText(commentaryEnabled ? createWinlinezCommentary("precisionClear") : "已精准清除 1 颗棋子。");
    }
    if (piece) return setSelected((prev) => (prev?.row === row && prev.col === col ? null : target));
    if (!selected) return;
    const movingPiece = board[selected.row][selected.col];
    if (!movingPiece) return;
    const path = findPath(board, selected, target);
    if (!path || path.length < 2) return setStatusText("目标不可达。");
    const moved = movePiece(board, selected, target);
    setSelected(null);
    if (moveMode === "blink") return resolveTurnAfterMove(moved, preview);
    setMovement({ fromKey: positionKey(selected), colorIndex: movingPiece.colorIndex, path, step: 0 });
    const pathStepDelay = SPEED_MS[speedPreset];
    for (let i = 1; i < path.length; i += 1) {
      await sleep(pathStepDelay);
      if (!mountedRef.current) return;
      setMovement((prev) => (prev ? { ...prev, step: i } : prev));
    }
    // Let the piece "land" before resolve to avoid abrupt end acceleration feel.
    await sleep(Math.max(28, Math.round(pathStepDelay * 0.65)));
    if (!mountedRef.current) return;
    setMovement(null);
    resolveTurnAfterMove(moved, preview);
  };

  return (
    <section className="mx-auto flex w-full flex-col gap-5 text-[#111]">
      <div className="overflow-hidden rounded-[2px] border-[3px] border-[#d8d8d8] shadow-[0_0_0_1px_#7f7f7f]" style={{ width: `${WINDOW_WIDTH}px`, maxWidth: "100%", background: currentTheme.windowBg }}>
        <div className="flex h-[38px] items-center justify-between px-3" style={{ background: currentTheme.titleBg }}>
          <div className="flex items-center gap-3"><div className="h-4 w-4 rounded-full bg-blue-600" /><div className="text-[18px] text-black">WinLinez v1.30</div></div>
          <div className="flex gap-[2px]"><button className="h-9 w-9 border border-[#8d8d8d] bg-[#d9d9d9]">-</button><button className="h-9 w-9 border border-[#8d8d8d] bg-[#d9d9d9]">□</button><button onClick={onClose} className="h-9 w-9 border border-[#8d8d8d] bg-[#d9d9d9]">×</button></div>
        </div>
        <div className="relative flex items-center justify-between border-b border-[#ededed] bg-[#d9d9d9] px-5 py-1.5 text-[18px] text-[#8d8d8d] shadow-[inset_0_1px_0_#f9f9f9]">
          <WinlinezSettingsMenu menuRef={menuRef} menuOpen={menuOpen} setMenuOpen={setMenuOpen} startNewGame={startNewGame} openLeaderboard={openLeaderboardModal} speedPreset={speedPreset} setSpeedPreset={setSpeedPreset} moveMode={moveMode} setMoveMode={setMoveMode} aidLevel={aidLevel} setAidLevel={setAidLevel} commentaryEnabled={commentaryEnabled} setCommentaryEnabled={setCommentaryEnabled} showReachableHint={showReachableHint} setShowReachableHint={setShowReachableHint} showPathPreview={showPathPreview} setShowPathPreview={setShowPathPreview} themeId={themeId} setThemeId={setThemeId} menuRecent={menuRecent} achievements={achievements} formatAidLevel={aidLabel} formatRecordTime={formatRecordTime} />
          <button type="button" onClick={() => setShowHelp(true)} className="cursor-pointer text-[#8a8a8a] hover:text-[#6f6f6f]">{"\u5e2e\u52a9(H)"}</button>
        </div>
        <div className="border-b border-[#9f9f9f] px-5 py-2 shadow-[inset_0_1px_0_#f7f7f7]" style={{ background: currentTheme.windowBg }}>
          {isCompact ? (
            <div className="flex flex-col gap-2">
              <div title="本局分数" className="flex h-10 min-w-[124px] items-center gap-2 border-[3px] border-[#f5f5f5] bg-black px-4 font-mono text-[20px] font-bold text-white"><span className="text-[12px] tracking-[0.14em] text-[#83d3ff]">YOU</span><span>{score}</span></div>
              <div className="flex items-center justify-center gap-4"><div className="text-[16px] text-white">{"\u4e0b\u7ec4"}</div><div className="flex gap-[2px]">{preview.map((p) => <div key={p.id} className="flex items-start justify-center border-[2px] border-[#d7d7d7] bg-[#c7c7c7]" style={{ width: `${previewBoxSize}px`, height: `${previewBoxSize}px` }}><div className="mt-[6px]" style={pieceStyle(p.colorIndex, previewSize, themeId)} /></div>)}</div><div className="text-[16px] text-white">{"\u989c\u8272"}</div></div>
            </div>
          ) : (
            <div className="grid items-center gap-6 lg:grid-cols-[190px_1fr_190px]">
              <div title="历史最高分" className="flex h-10 min-w-[124px] items-center gap-2 border-[3px] border-[#f5f5f5] bg-black px-4 font-mono text-[20px] font-bold text-white"><span className="text-[12px] tracking-[0.14em] text-[#ffe08a]">HIGH</span><span>{bestScoreDisplay}</span></div>
              <div className="flex items-center justify-center gap-8"><div className="text-[18px] text-white">{"\u4e0b\u7ec4"}</div><div className="flex gap-[2px]">{preview.map((p) => <div key={p.id} className="flex items-start justify-center border-[2px] border-[#d7d7d7] bg-[#c7c7c7]" style={{ width: `${previewBoxSize}px`, height: `${previewBoxSize}px` }}><div className="mt-[6px]" style={pieceStyle(p.colorIndex, previewSize, themeId)} /></div>)}</div><div className="text-[18px] text-white">{"\u989c\u8272"}</div></div>
              <div className="flex justify-end"><div title="本局分数" className="flex h-10 min-w-[124px] items-center justify-end gap-2 border-[3px] border-[#f5f5f5] bg-black px-4 font-mono text-[20px] font-bold text-white"><span className="text-[12px] tracking-[0.14em] text-[#83d3ff]">YOU</span><span>{score}</span></div></div>
            </div>
          )}
        </div>
        <div className={`${isCompact ? "px-2 py-2" : "px-5 py-2"}`} style={{ background: currentTheme.windowBg }}>
          <div className="flex border border-[#7d7d7d]" style={{ background: currentTheme.panelBg }}>
            {!isCompact ? <div className="flex w-[278px] flex-col items-center justify-between px-6 py-6"><div className="flex flex-col items-center"><KingAvatar side="left" score={bestScore} themeId={themeId} /><Pillar /></div>{aidLevel !== "none" ? <div className="grid w-full gap-2"><button type="button" onClick={useClearRandomTool} disabled={toolStock.clearRandom <= 0} className="border border-[#7a7a7a] bg-[#d1d1d1] px-2 py-2 text-sm disabled:opacity-50">{`\u968f\u673a\u6d88\u9664(${clearRangeLabel}) ${toolStock.clearRandom}`}</button><button type="button" onClick={useShuffleTool} disabled={toolStock.shuffle <= 0} className="border border-[#7a7a7a] bg-[#d1d1d1] px-2 py-2 text-sm disabled:opacity-50">{"\u6d17\u724c"} {toolStock.shuffle}</button><button type="button" onClick={useRerollPreviewTool} disabled={toolStock.rerollPreview <= 0} className="border border-[#7a7a7a] bg-[#d1d1d1] px-2 py-2 text-sm disabled:opacity-50">{"\u5237\u65b0\u4e0b\u7ec4"} {toolStock.rerollPreview}</button><button type="button" onClick={armTargetClearTool} disabled={toolStock.clearTarget <= 0} className="border border-[#7a7a7a] bg-[#d1d1d1] px-2 py-2 text-sm disabled:opacity-50">{"\u7cbe\u51c6\u6e05\u9664"} {toolStock.clearTarget}</button></div> : null}<div className="font-mono text-[28px]" style={{ color: currentTheme.panelText }}>{new Date().toISOString().slice(0, 10).replace(/-/g, "")}</div></div> : null}
            <div className="flex flex-1 items-center justify-center py-1"><div className="relative grid p-[6px]" style={{ gridTemplateColumns: `repeat(${WINLINEZ_BOARD_SIZE}, ${boardCell}px)`, gap: `${BOARD_GAP}px`, background: currentTheme.boardBg }}>{board.map((row, r) => row.map((cell, c) => { const key = positionKey({ row: r, col: c }); const isSelected = selected?.row === r && selected.col === c; const movingFromHere = movement?.fromKey === key; const burst = burstItems.find((b) => b.key === key); const isReachable = !cell && reachable.has(key); const isPathCell = pathKeys.has(key); return <button key={key} type="button" onClick={() => handleCellClick(r, c)} onMouseEnter={() => setHoverTarget({ row: r, col: c })} onMouseLeave={() => setHoverTarget((prev) => (prev?.row === r && prev?.col === c ? null : prev))} disabled={Boolean(movement)} className={`relative flex items-start justify-center border border-[#2d2d2d] shadow-[inset_2px_2px_0_#fbfbfb,inset_-2px_-2px_0_#7a7a7a] ${isReachable ? "ring-1 ring-[#4a7cff]" : ""} ${isPathCell ? "ring-1 ring-[#35c47b]" : ""}`} style={{ width: boardCell, height: boardCell, background: isPathCell ? "rgba(76,190,120,0.22)" : isReachable ? "rgba(150,183,255,0.22)" : currentTheme.cellBg }}>{cell && !movingFromHere ? <div className="absolute left-1/2 top-[4px] -translate-x-1/2"><div className={isSelected ? "animate-winlinez-selected" : ""} style={pieceStyle(cell.colorIndex, ballSize, themeId)} /></div> : null}{burst ? <div className="absolute left-1/2 top-[4px] -translate-x-1/2"><div className="animate-winlinez-burst-core" style={pieceStyle(burst.colorIndex, ballSize, themeId)} /></div> : null}</button>; }))}{movement && movingPos ? <div className="pointer-events-none absolute z-20" style={{ left: `${movingX}px`, top: `${movingY}px`, width: ballSize, height: ballSize, transition: `left ${SPEED_MS[speedPreset]}ms linear, top ${SPEED_MS[speedPreset]}ms linear` }}><div style={pieceStyle(movement.colorIndex, ballSize, themeId)} /></div> : null}</div></div>
            {!isCompact ? <div className="flex w-[278px] flex-col items-center justify-start gap-3 px-8 py-6" style={{ color: currentTheme.panelText }}><div className="flex flex-col items-center"><KingAvatar side="right" score={score} themeId={themeId} /><Pillar /></div><div className="text-[22px] font-bold tracking-[0.08em]">{"\u6311\u6218\u8005"}</div><div className="text-[16px]">{user ? "\u767b\u5f55\u8bb0\u5f55" : "\u6e38\u5ba2\u8bb0\u5f55"}</div><div className="text-[16px]">{"\u6700\u9ad8\u5206"} {bestScoreDisplay}</div><div className="text-[16px]">{"\u6b65\u6570"} {movesPlayed}</div><div className="text-[16px]">{"\u4e3b\u9898"} {currentTheme.label}</div><button type="button" onClick={openLeaderboardModal} className="border border-[#7a7a7a] bg-[#d1d1d1] px-3 py-1.5 text-[13px] text-[#1f1f1f]">排行榜 Top10</button>{commentaryEnabled ? <div className="flex min-h-[56px] w-full items-start gap-3 text-[15px] leading-6"><span className="mt-[8px] h-2.5 w-2.5 shrink-0 rounded-full bg-[#d91e1e]" /><span className="block max-w-[190px] break-words">{statusText}</span></div> : null}</div> : null}
          </div>
          {isCompact && aidLevel !== "none" ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={useClearRandomTool} disabled={toolStock.clearRandom <= 0} className="border border-[#7a7a7a] bg-[#d1d1d1] px-2 py-2 text-[14px] leading-5 disabled:opacity-50">
                {`\u968f\u673a\u6d88\u9664(${clearRangeLabel}) ${toolStock.clearRandom}`}
              </button>
              <button type="button" onClick={useShuffleTool} disabled={toolStock.shuffle <= 0} className="border border-[#7a7a7a] bg-[#d1d1d1] px-2 py-2 text-[14px] leading-5 disabled:opacity-50">
                {"\u6d17\u724c"} {toolStock.shuffle}
              </button>
              <button type="button" onClick={useRerollPreviewTool} disabled={toolStock.rerollPreview <= 0} className="border border-[#7a7a7a] bg-[#d1d1d1] px-2 py-2 text-[14px] leading-5 disabled:opacity-50">
                {"\u5237\u65b0\u4e0b\u7ec4"} {toolStock.rerollPreview}
              </button>
              <button type="button" onClick={armTargetClearTool} disabled={toolStock.clearTarget <= 0} className="border border-[#7a7a7a] bg-[#d1d1d1] px-2 py-2 text-[14px] leading-5 disabled:opacity-50">
                {"\u7cbe\u51c6\u6e05\u9664"} {toolStock.clearTarget}
              </button>
            </div>
          ) : null}
          {isCompact && commentaryEnabled ? (
            <div className="mt-2 flex min-h-[46px] items-start gap-2 border border-[#6e6e6e] px-2 py-2 text-[14px] leading-6" style={{ background: currentTheme.panelBg, color: currentTheme.panelText }}>
              <span className="mt-[8px] h-2.5 w-2.5 shrink-0 rounded-full bg-[#d91e1e]" />
              <span className="block break-words">{statusText}</span>
            </div>
          ) : null}
        </div>
      </div>

      {showHelp ? (
        <div className="fixed inset-0 z-[86] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-[760px] rounded border-[3px] border-[#d7d7d7] bg-[#d8d8d8] p-4 shadow-[0_0_0_1px_#777]">
            <div className="text-[24px] font-bold text-[#1f1f1f]">{"WinLinez \u73a9\u6cd5\u8bf4\u660e\uff08\u8be6\u7ec6\u7248\uff09"}</div>
            <div className="mt-3 max-h-[70vh] overflow-y-auto rounded border border-[#a2a2a2] bg-[#cfcfcf] p-4 text-[15px] leading-7 text-[#202020]">
              <h3 className="text-[17px] font-semibold">{"1. \u76ee\u6807\u4e0e\u7ed3\u675f\u6761\u4ef6"}</h3>
              <p>{"\u76ee\u6807\u662f\u5c3d\u91cf\u83b7\u5f97\u9ad8\u5206\u3002\u5c06\u540c\u8272\u68cb\u5b50\u5728\u6a2a\u5411\u3001\u7eb5\u5411\u3001\u659c\u5411\u8fde\u6210 5 \u9897\u53ca\u4ee5\u4e0a\u4f1a\u7acb\u5373\u6d88\u9664\u5e76\u5f97\u5206\u3002\u68cb\u76d8\u4e3a 9x9\uff0c\u5f53\u65e0\u6cd5\u7ee7\u7eed\u63a8\u8fdb\u65f6\u672c\u5c40\u7ed3\u675f\u3002"}</p>
              <h3 className="mt-3 text-[17px] font-semibold">{"2. \u6bcf\u56de\u5408\u6d41\u7a0b"}</h3>
              <p>{"\u6bcf\u56de\u5408\u4ec5\u80fd\u79fb\u52a8 1 \u9897\u68cb\u5b50\uff0c\u7ec8\u70b9\u5fc5\u987b\u662f\u53ef\u8fbe\u7a7a\u4f4d\uff08\u4e2d\u95f4\u6709\u8fde\u901a\u8def\u5f84\uff0c\u4e0d\u80fd\u7a7f\u8fc7\u5176\u4ed6\u68cb\u5b50\uff09\u3002"}</p>
              <p>{"\u79fb\u52a8\u5b8c\u6210\u540e\u5148\u5224\u5b9a\u662f\u5426\u6d88\u9664\uff1a\u82e5\u5df2\u6d88\u9664\uff0c\u5219\u672c\u56de\u5408\u7ed3\u675f\uff0c\u4e0d\u518d\u4e0b\u843d\u201c\u4e0b\u7ec4\u201d3 \u9897\u7403\u3002"}</p>
              <p>{"\u82e5\u6ca1\u6709\u6d88\u9664\uff0c\u5219\u628a\u9876\u90e8\u201c\u4e0b\u7ec4\u201d3 \u9897\u7403\u4e0b\u843d\u5230\u968f\u673a\u7a7a\u4f4d\uff0c\u4e0b\u843d\u540e\u518d\u505a\u4e00\u6b21\u6d88\u9664\u5224\u5b9a\uff0c\u7136\u540e\u5237\u65b0\u4e0b\u4e00\u7ec4\u9884\u89c8\u3002"}</p>
              <h3 className="mt-3 text-[17px] font-semibold">{"3. \u79ef\u5206\u89c4\u5219\uff08\u660e\u786e\u6570\u503c\uff09"}</h3>
              <p>{"\u5355\u6b21\u7ed3\u7b97\u603b\u5206 = \u957f\u5ea6\u5206 + \u591a\u7ebf\u52a0\u6210\u3002"}</p>
              <p>{"\u957f\u5ea6\u5206\uff08\u6309\u5355\u6b21\u6d88\u9664\u603b\u6570 N\uff09\uff1a5 \u8fde=10 \u5206\uff0c6 \u8fde=14 \u5206\uff0c7 \u8fde=20 \u5206\uff0c8 \u8fde=28 \u5206\uff0c9 \u8fde=38 \u5206\u3002\u5355\u6b21\u6309 9 \u8fde\u5c01\u9876\uff0c\u4e0d\u8ba1\u7b97 10+\u3002"}</p>
              <p>{"\u591a\u7ebf\u52a0\u6210\uff1a\u82e5\u540c\u4e00\u6b21\u7ed3\u7b97\u6d88\u9664\u4e86 L \u6761\u7ebf\uff0c\u989d\u5916\u52a0 (L-1)x6 \u5206\u3002\u5de6\u4e0a\u89d2\u9ed1\u6846\u4e3a HI\uff08\u5386\u53f2\u6700\u9ad8\u5206\uff09\uff0c\u53f3\u4e0a\u89d2\u9ed1\u6846\u4e3a YOU\uff08\u672c\u5c40\u5f53\u524d\u5206\uff09\u3002"}</p>
              <h3 className="mt-3 text-[17px] font-semibold">{"4. \u96be\u5ea6\u4e0e\u9053\u5177"}</h3>
              <p>{"0 \u6863\u9053\u5177\u662f\u539f\u7248\u96be\u5ea6\uff08\u6700\u96be\uff0c\u65e0\u9053\u5177\uff09\uff1b1 \u6863\u5e73\u8861\uff1b2 \u6863\u8f7b\u677e\u3002\u5386\u53f2\u8bb0\u5f55\u4f1a\u6807\u6ce8\u96be\u5ea6\uff0c\u4fbf\u4e8e\u540c\u6863\u5bf9\u6bd4\u3002"}</p>
              <p>{"\u968f\u673a\u6d88\u9664\uff1a\u968f\u673a\u79fb\u9664\u82e5\u5e72\u68cb\u5b50\u3002\u6d17\u724c\uff1a\u4fdd\u7559\u6570\u91cf\u4e0e\u989c\u8272\uff0c\u4ec5\u91cd\u6392\u4f4d\u7f6e\uff1b\u82e5\u5f62\u6210\u8fde\u7ebf\uff0c\u7167\u5e38\u6d88\u9664\u8ba1\u5206\u3002\u5237\u65b0\u4e0b\u7ec4\uff1a\u4ec5\u5237\u65b0\u9876\u90e8\u4e0b\u4e00\u7ec4\u3002\u7cbe\u51c6\u6e05\u9664\uff1a\u624b\u52a8\u70b9\u9009\u4e00\u9897\u68cb\u5b50\u5220\u9664\u3002"}</p>
              <p>{"\u4fdd\u62a4\u89c4\u5219\uff1a\u4efb\u610f\u9053\u5177\u90fd\u4e0d\u4f1a\u628a\u68cb\u76d8\u6e05\u7a7a\uff0c\u7cfb\u7edf\u59cb\u7ec8\u81f3\u5c11\u4fdd\u7559 1 \u9897\u68cb\u5b50\u3002"}</p>
              <h3 className="mt-3 text-[17px] font-semibold">{"5. \u79fb\u52a8\u4e0e\u8f85\u52a9\u663e\u793a"}</h3>
              <p>{"\u79fb\u52a8\u65b9\u5f0f\u652f\u6301\u201c\u8def\u5f84\u79fb\u52a8\u201d\u4e0e\u201c\u95ea\u8df3\u79fb\u52a8\u201d\uff1b\u8def\u5f84\u79fb\u52a8\u652f\u6301\u6162/\u9ed8\u8ba4/\u5feb\u3002\u8f85\u52a9\u663e\u793a\u652f\u6301\u53ef\u8fbe\u9ad8\u4eae\u3001\u5b8c\u6574\u8def\u5f84\u9884\u89c8\u3001\u8da3\u5473\u89e3\u8bf4\u5f00\u5173\u3002"}</p>
              <h3 className="mt-3 text-[17px] font-semibold">{"6. \u7ed3\u7b97\u3001\u8bb0\u5f55\u4e0e\u6210\u5c31"}</h3>
              <p>{"\u6bcf\u5c40\u7ed3\u675f\u4f1a\u81ea\u52a8\u4fdd\u5b58\u672c\u5c40\u4fe1\u606f\uff08\u5206\u6570\u3001\u6b65\u6570\u3001\u6d88\u9664\u6570\u3001\u96be\u5ea6\u3001\u4e3b\u9898\u3001\u9053\u5177\u4f7f\u7528\u7b49\uff09\u3002\u8bbe\u7f6e\u83dc\u5355\u53ef\u67e5\u770b\u6700\u8fd1\u8bb0\u5f55\u3001\u540c\u96be\u5ea6\u6392\u884c\u699c\uff0c\u4ee5\u53ca\u672c\u673a\u7d2f\u8ba1\u6210\u5c31\uff085/6/7/8 \u8fde\u6b21\u6570\uff09\u3002"}</p>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setShowHelp(false)} className="border border-[#7a7a7a] bg-[#d1d1d1] px-4 py-2 text-sm">{"\u6211\u77e5\u9053\u4e86"}</button>
            </div>
          </div>
        </div>
      ) : null}
      {showRoundSummary ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-3"><div className="w-full max-w-[560px] rounded border-[3px] border-[#d7d7d7] bg-[#d8d8d8] p-4 shadow-[0_0_0_1px_#777]"><div className="text-[22px] font-bold text-[#1f1f1f]">{"\u672c\u5c40\u7ed3\u7b97"}</div><div className="mt-2 rounded border border-[#a2a2a2] bg-[#d9e0ea] px-3 py-2 text-[14px] leading-6 text-[#1f2b36]">{roundSummaryText || "\u8fd9\u5c40\u6253\u5f97\u4e0d\u9519\uff0c\u7ee7\u7eed\u52a0\u6cb9\uff01"}</div><div className="mt-3 grid gap-2 rounded border border-[#a2a2a2] bg-[#cfcfcf] p-3 text-[14px] text-[#202020]"><div>{"\u5f97\u5206\uff1a"}{score}</div><div>{"\u6b65\u6570\uff1a"}{movesPlayed}</div><div>{"\u6d88\u9664\u7ebf\u6570\uff1a"}{linesCleared}</div><div>{"\u6d88\u9664\u68cb\u5b50\uff1a"}{ballsCleared}</div><div>{"\u96be\u5ea6\uff1a"}{aidLabel(aidLevel)}</div></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setShowRoundSummary(false)} className="border border-[#7a7a7a] bg-[#d1d1d1] px-3 py-2 text-sm">{"\u5173\u95ed"}</button><button type="button" onClick={startNewGame} className="border border-[#5676a7] bg-[#c8d7ec] px-3 py-2 text-sm">{"\u518d\u6765\u4e00\u5c40"}</button></div></div></div> : null}
      <WinlinezLeaderboardModal
        open={showLeaderboard}
        loading={leaderboardLoading}
        aidLevel={leaderboardAid}
        leaderboard={leaderboardRows}
        onClose={() => setShowLeaderboard(false)}
        onAidLevelChange={changeLeaderboardAid}
      />
      <style jsx global>{`@keyframes winlinez-selected{0%{transform:translateY(0) scale(1,1)}20%{transform:translateY(-2px) scale(0.95,1.05)}45%{transform:translateY(-8px) scale(1.03,0.97)}62%{transform:translateY(-4px) scale(0.98,1.02)}100%{transform:translateY(0) scale(1,1)}} @keyframes winlinez-burst-core{0%{transform:scale(1);opacity:1}100%{transform:scale(.55);opacity:0}} .animate-winlinez-selected{transform-origin:50% 100%;animation:winlinez-selected .72s cubic-bezier(.34,1.56,.64,1) infinite}.animate-winlinez-burst-core{animation:winlinez-burst-core .32s ease-out forwards}`}</style>
    </section>
  );
}
