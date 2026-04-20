"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Settings } from "lucide-react";
import type { WinlinezGameRecord } from "@/lib/winlinez";

type SpeedPreset = "slow" | "normal" | "fast";
type MoveMode = "path" | "blink";
type ThemeId = "retro" | "neon" | "frost" | "nova";
type AidLevel = "none" | "assist" | "boost";

type WinlinezSettingsMenuProps = {
  menuRef: { current: HTMLDivElement | null };
  menuOpen: boolean;
  setMenuOpen: (updater: (prev: boolean) => boolean) => void;
  startNewGame: () => void;
  openLeaderboard: () => void;
  speedPreset: SpeedPreset;
  setSpeedPreset: (value: SpeedPreset) => void;
  moveMode: MoveMode;
  setMoveMode: (value: MoveMode) => void;
  aidLevel: AidLevel;
  setAidLevel: (value: AidLevel) => void;
  commentaryEnabled: boolean;
  setCommentaryEnabled: (updater: (prev: boolean) => boolean) => void;
  showReachableHint: boolean;
  setShowReachableHint: (updater: (prev: boolean) => boolean) => void;
  showPathPreview: boolean;
  setShowPathPreview: (updater: (prev: boolean) => boolean) => void;
  themeId: ThemeId;
  setThemeId: (value: ThemeId) => void;
  menuRecent: WinlinezGameRecord[];
  achievements: { line5: number; line6: number; line7: number; line8: number };
  formatAidLevel: (level?: "none" | "assist" | "boost") => string;
  formatRecordTime: (value: string) => string;
};

const AID_LEVELS: AidLevel[] = ["none", "assist", "boost"];
const SPEEDS: SpeedPreset[] = ["slow", "normal", "fast"];
const THEME_IDS: ThemeId[] = ["retro", "neon", "frost", "nova"];
const THEME_LABEL: Record<ThemeId, string> = {
  retro: "复古",
  neon: "霓虹",
  frost: "冰晶",
  nova: "新星",
};

function speedText(value: SpeedPreset) {
  if (value === "slow") return "慢";
  if (value === "fast") return "快";
  return "默认";
}

export function WinlinezSettingsMenu({
  menuRef,
  menuOpen,
  setMenuOpen,
  startNewGame,
  openLeaderboard,
  speedPreset,
  setSpeedPreset,
  moveMode,
  setMoveMode,
  aidLevel,
  setAidLevel,
  commentaryEnabled,
  setCommentaryEnabled,
  showReachableHint,
  setShowReachableHint,
  showPathPreview,
  setShowPathPreview,
  themeId,
  setThemeId,
  menuRecent,
  achievements,
  formatAidLevel,
  formatRecordTime,
}: WinlinezSettingsMenuProps) {
  const [menuClosing, setMenuClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const closeMenuWithAnim = () => {
    setMenuClosing(true);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setMenuOpen(() => false);
      setMenuClosing(false);
    }, 170);
  };

  useEffect(() => {
    if (!menuOpen) setMenuClosing(false);
  }, [menuOpen]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    },
    []
  );

  const renderMenu = menuOpen || menuClosing;

  return (
    <div ref={menuRef as RefObject<HTMLDivElement>} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((p) => !p)}
        className={`inline-flex items-center gap-2 border px-3 py-1 text-[18px] ${
          menuOpen
            ? "border-[#666] bg-[#c7c7c7] text-[#2b2b2b] shadow-[inset_1px_1px_0_#7c7c7c,inset_-1px_-1px_0_#efefef]"
            : "border-[#b9b9b9] bg-[#d9d9d9] text-[#727272] shadow-[inset_1px_1px_0_#ffffff,inset_-1px_-1px_0_#7d7d7d]"
        }`}
      >
        <Settings className="h-4 w-4" />
        设置
      </button>

      {renderMenu ? (
        <div
          className={`absolute left-0 top-[40px] z-50 w-[420px] max-w-[calc(100vw-28px)] overflow-x-hidden overflow-y-auto border border-[#7e7e7e] bg-[#dcdcdc] p-2 shadow-[2px_2px_0_#6d6d6d] transition-all duration-150 ease-out max-sm:fixed max-sm:left-2 max-sm:right-2 max-sm:top-[72px] max-sm:w-auto max-sm:max-h-[70vh] ${
            menuClosing ? "translate-y-1 scale-[0.985] opacity-0" : "translate-y-0 scale-100 opacity-100"
          }`}
        >
          <div className="hidden items-center justify-between gap-2 px-2 py-1 max-sm:flex">
            <button
              type="button"
              onClick={() => {
                startNewGame();
                closeMenuWithAnim();
              }}
              className="flex items-center gap-2 border border-[#7a7a7a] bg-[#d1d1d1] px-3 py-2 text-[14px] text-[#1f1f1f]"
              title="立刻开始新一局"
            >
              新开一局
              <span className="text-[#5e5e5e]">F2</span>
            </button>
            <button
              type="button"
              onClick={closeMenuWithAnim}
              className="border border-[#4b6da0] bg-[#c8d7ec] px-3 py-2 text-[14px] text-[#1f2f47]"
              title="保存当前设置并收起菜单"
            >
              确定并收起
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              startNewGame();
              closeMenuWithAnim();
            }}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-[16px] text-[#1f1f1f] hover:bg-[#c8d7ec] max-sm:hidden"
            title="立刻开始新一局"
          >
            <span>新开一局</span>
            <span className="text-[#5e5e5e]">F2</span>
          </button>
          <button
            type="button"
            onClick={() => {
              openLeaderboard();
              closeMenuWithAnim();
            }}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-[16px] text-[#1f1f1f] hover:bg-[#c8d7ec]"
            title="查看全网总榜"
          >
            <span>查看排行榜</span>
            <span className="text-[#5e5e5e]">Top10</span>
          </button>

          <div className="my-2 h-px bg-[#9f9f9f]" />
          <div className="px-3 pb-1 text-[14px] text-[#4a4a4a]">移动速度</div>
          <div className="grid grid-cols-2 gap-2 px-2 sm:grid-cols-4">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                title={s === "slow" ? "移动更慢，方便观察" : s === "normal" ? "默认速度" : "移动更快"}
                onClick={() => {
                  setMoveMode("path");
                  setSpeedPreset(s);
                }}
                className={`whitespace-nowrap border px-2 py-2 text-sm ${
                  moveMode === "path" && speedPreset === s ? "border-[#4b6da0] bg-[#c8d7ec]" : "border-[#a6a6a6] bg-[#d7d7d7]"
                }`}
              >
                {speedText(s)}
              </button>
            ))}
            <button
              type="button"
              title="直接瞬移到目标格，不播放路径动画"
              onClick={() => setMoveMode("blink")}
              className={`whitespace-nowrap border px-2 py-2 text-sm ${
                moveMode === "blink" ? "border-[#4b6da0] bg-[#c8d7ec]" : "border-[#a6a6a6] bg-[#d7d7d7]"
              }`}
            >
              闪跳
            </button>
          </div>

          <div className="my-2 h-px bg-[#9f9f9f]" />
          <div className="px-3 pb-1 text-[14px] text-[#4a4a4a]">道具档位</div>
          <div className="grid grid-cols-3 gap-2 px-2">
            {AID_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                title={level === "none" ? "原版难度，无道具" : level === "assist" ? "少量道具" : "更多道具"}
                onClick={() => setAidLevel(level)}
                className={`whitespace-nowrap border px-2 py-2 text-sm ${
                  aidLevel === level ? "border-[#4b6da0] bg-[#c8d7ec]" : "border-[#a6a6a6] bg-[#d7d7d7]"
                }`}
              >
                {level === "none" ? "0档" : level === "assist" ? "1档" : "2档"}
              </button>
            ))}
          </div>

          <div className="my-2 h-px bg-[#9f9f9f]" />
          <div className="px-3 pb-1 text-[14px] text-[#4a4a4a]">辅助</div>
          <div className="grid grid-cols-2 gap-2 px-2 sm:grid-cols-3">
            <button
              type="button"
              title="右下角状态栏启用解说播报"
              onClick={() => setCommentaryEnabled((v) => !v)}
              className={`whitespace-nowrap border px-2 py-2 text-sm ${
                commentaryEnabled ? "border-[#4b6da0] bg-[#c8d7ec]" : "border-[#a6a6a6] bg-[#d7d7d7]"
              }`}
            >
              解说 {commentaryEnabled ? "开" : "关"}
            </button>
            <button
              type="button"
              title="选中棋子后显示可达格"
              onClick={() => setShowReachableHint((v) => !v)}
              className={`whitespace-nowrap border px-2 py-2 text-sm ${
                showReachableHint ? "border-[#4b6da0] bg-[#c8d7ec]" : "border-[#a6a6a6] bg-[#d7d7d7]"
              }`}
            >
              可达格 {showReachableHint ? "开" : "关"}
            </button>
            <button
              type="button"
              title="悬停目标格时显示完整路径"
              onClick={() => setShowPathPreview((v) => !v)}
              className={`whitespace-nowrap border px-2 py-2 text-sm ${
                showPathPreview ? "border-[#4b6da0] bg-[#c8d7ec]" : "border-[#a6a6a6] bg-[#d7d7d7]"
              }`}
            >
              路线预览 {showPathPreview ? "开" : "关"}
            </button>
          </div>

          <div className="my-2 h-px bg-[#9f9f9f]" />
          <div className="px-3 pb-1 text-[14px] text-[#4a4a4a]">主题</div>
          <div className="grid grid-cols-2 gap-2 px-2 sm:grid-cols-4">
            {THEME_IDS.map((id) => (
              <button
                key={id}
                type="button"
                title={`切换到 ${THEME_LABEL[id]} 主题`}
                onClick={() => setThemeId(id)}
                className={`whitespace-nowrap border px-2 py-2 text-sm ${
                  themeId === id ? "border-[#4b6da0] bg-[#c8d7ec]" : "border-[#a6a6a6] bg-[#d7d7d7]"
                }`}
              >
                {THEME_LABEL[id]}
              </button>
            ))}
          </div>

          <div className="my-2 h-px bg-[#9f9f9f]" />
          <div className="px-3 pb-1 text-[14px] text-[#4a4a4a]">最近记录</div>
          {menuRecent.length === 0 ? (
            <div className="mx-2 rounded border border-[#b0b0b0] bg-[#d2d2d2] px-3 py-2 text-[14px] text-[#6a6a6a]">还没有记录</div>
          ) : (
            <div className="grid gap-1 px-2">
              {menuRecent.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="flex flex-col gap-1 rounded border border-[#b0b0b0] bg-[#d2d2d2] px-3 py-2 text-[13px] text-[#222] sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    {item.score} 分 · {formatAidLevel(item.aidLevel)} · {item.durationSec || 0}s
                  </span>
                  <span className="text-[#666]">{formatRecordTime(item.created_at)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="my-2 h-px bg-[#9f9f9f]" />
          <div className="px-3 pb-1 text-[14px] text-[#4a4a4a]">成就统计（本机累计）</div>
          <div className="grid grid-cols-1 gap-2 px-2 pb-2 sm:grid-cols-2">
            <div className="rounded border border-[#b0b0b0] bg-[#d2d2d2] px-3 py-2 text-[13px] text-[#222]">5 连消：{achievements.line5}</div>
            <div className="rounded border border-[#b0b0b0] bg-[#d2d2d2] px-3 py-2 text-[13px] text-[#222]">6 连消：{achievements.line6}</div>
            <div className="rounded border border-[#b0b0b0] bg-[#d2d2d2] px-3 py-2 text-[13px] text-[#222]">7 连消：{achievements.line7}</div>
            <div className="rounded border border-[#b0b0b0] bg-[#d2d2d2] px-3 py-2 text-[13px] text-[#222]">8 连消：{achievements.line8}</div>
          </div>

          <div className="mt-1 hidden justify-end px-2 pb-1 max-sm:hidden">
            <button
              type="button"
              onClick={closeMenuWithAnim}
              className="border border-[#4b6da0] bg-[#c8d7ec] px-4 py-2 text-sm text-[#1f2f47] shadow-[inset_1px_1px_0_#e8f0ff,inset_-1px_-1px_0_#7d93b1]"
              title="保存当前设置并收起菜单"
            >
              确定并收起
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
