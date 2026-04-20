"use client";

import type { WinlinezGameRecord } from "@/lib/winlinez";

type AidLevel = "none" | "assist" | "boost";

type WinlinezHistoryPanelsProps = {
  history: WinlinezGameRecord[];
  deletingHistoryId: string | number | null;
  handleDeleteHistoryRecord: (recordId: string | number) => void;
  historyByAid: Record<AidLevel, WinlinezGameRecord[]>;
  formatAidLevel: (level?: "none" | "assist" | "boost") => string;
  formatRecordTime: (value: string) => string;
  isCompact: boolean;
};

export function WinlinezHistoryPanels({
  history,
  deletingHistoryId,
  handleDeleteHistoryRecord,
  historyByAid,
  formatAidLevel,
  formatRecordTime,
  isCompact,
}: WinlinezHistoryPanelsProps) {
  return (
    <>
      <div className="mt-3 rounded border border-[#909090] bg-[#d8d8d8] p-2">
        <div className="px-1 pb-2 text-[14px] font-semibold text-[#2b2b2b]">历史分数</div>
        {history.length === 0 ? (
          <div className="rounded border border-[#b1b1b1] bg-[#cdcdcd] px-3 py-3 text-[13px] text-[#585858]">
            暂无记录，完成一局后会自动保存。
          </div>
        ) : (
          <div className="grid gap-1">
            {history.slice(0, 20).map((item) => (
              <div key={String(item.id)} className="flex items-center justify-between rounded border border-[#b0b0b0] bg-[#cfcfcf] px-2 py-1 text-[13px] text-[#202020]">
                <span>
                  {item.score} 分 · {formatAidLevel(item.aidLevel)} · {item.durationSec || 0}s · {formatRecordTime(item.created_at)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteHistoryRecord(item.id)}
                  disabled={Boolean(deletingHistoryId)}
                  className="border border-[#7c7c7c] bg-[#e5e5e5] px-2 py-0.5 text-[12px] shadow-[inset_1px_1px_0_#fff,inset_-1px_-1px_0_#8b8b8b] disabled:opacity-60"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 rounded border border-[#909090] bg-[#d8d8d8] p-2">
        <div className="px-1 pb-2 text-[14px] font-semibold text-[#2b2b2b]">排行榜（按道具难度）</div>
        <div className={`grid gap-2 ${isCompact ? "grid-cols-1" : "grid-cols-3"}`}>
          {(["none", "assist", "boost"] as AidLevel[]).map((levelKey) => (
            <div key={levelKey} className="rounded border border-[#b0b0b0] bg-[#cfcfcf] p-2">
              <div className="pb-1 text-[13px] font-semibold text-[#202020]">{formatAidLevel(levelKey)}</div>
              {historyByAid[levelKey].length === 0 ? (
                <div className="text-[12px] text-[#606060]">暂无记录</div>
              ) : (
                <div className="grid gap-1">
                  {historyByAid[levelKey].map((item, index) => (
                    <div key={`${levelKey}-${item.id}-${index}`} className="flex items-center justify-between text-[12px] text-[#1f1f1f]">
                      <span>
                        #{index + 1} {item.score}
                      </span>
                      <span className="text-[#666]">{formatRecordTime(item.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

