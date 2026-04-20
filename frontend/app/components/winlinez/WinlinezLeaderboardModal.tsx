"use client";

type AidLevel = "none" | "assist" | "boost";

export type WinlinezLeaderboardRow = {
  userId: number;
  userName: string;
  avatar?: string | null;
  score: number;
  created_at: string;
  aidLevel: AidLevel;
};

type WinlinezLeaderboardModalProps = {
  open: boolean;
  loading: boolean;
  aidLevel: AidLevel;
  onClose: () => void;
  onAidLevelChange: (value: AidLevel) => void;
  leaderboard: WinlinezLeaderboardRow[];
};

const AID_TABS: Array<{ id: AidLevel; label: string }> = [
  { id: "none", label: "无道具" },
  { id: "assist", label: "1档道具" },
  { id: "boost", label: "2档道具" },
];

function formatTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}-${mm}-${dd} ${hh}:${mi}`;
}

export function WinlinezLeaderboardModal({
  open,
  loading,
  aidLevel,
  onClose,
  onAidLevelChange,
  leaderboard,
}: WinlinezLeaderboardModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-3">
      <div className="w-full max-w-[760px] rounded border-[3px] border-[#d7d7d7] bg-[#d8d8d8] p-4 shadow-[0_0_0_1px_#777]">
        <div className="flex items-center justify-between">
          <div className="text-[22px] font-bold text-[#1f1f1f]">全网总榜（Top 10）</div>
          <button type="button" onClick={onClose} className="border border-[#7a7a7a] bg-[#d1d1d1] px-3 py-1 text-sm">
            关闭
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {AID_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onAidLevelChange(tab.id)}
              className={`border px-2 py-2 text-sm ${
                aidLevel === tab.id ? "border-[#4b6da0] bg-[#c8d7ec]" : "border-[#a6a6a6] bg-[#d7d7d7]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded border border-[#9f9f9f] bg-[#d0d0d0] p-2">
          <div className="grid grid-cols-[64px_1fr_120px_180px] items-center border-b border-[#a2a2a2] px-2 pb-2 text-[13px] font-semibold text-[#333] max-sm:grid-cols-[52px_1fr_90px]">
            <div>排名</div>
            <div>玩家</div>
            <div className="text-right max-sm:text-center">分数</div>
            <div className="text-right max-sm:hidden">时间</div>
          </div>

          {loading ? <div className="px-3 py-6 text-[14px] text-[#555]">排行榜加载中...</div> : null}
          {!loading && leaderboard.length === 0 ? <div className="px-3 py-6 text-[14px] text-[#555]">暂无记录。</div> : null}

          {!loading ? (
            <div className="max-h-[52vh] overflow-y-auto">
              {leaderboard.map((item, index) => (
                <div key={`${item.userId}-${item.created_at}-${index}`} className="grid grid-cols-[64px_1fr_120px_180px] items-center border-b border-[#b6b6b6] px-2 py-2 text-[14px] text-[#222] last:border-b-0 max-sm:grid-cols-[52px_1fr_90px]">
                  <div className="font-bold">{index + 1}</div>
                  <div className="flex min-w-0 items-center gap-2">
                    {item.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.avatar} alt="" className="h-6 w-6 rounded-full border border-[#8b8b8b] object-cover" />
                    ) : (
                      <span className="h-6 w-6 rounded-full border border-[#8b8b8b] bg-[#bdbdbd]" />
                    )}
                    <span className="truncate">{item.userName}</span>
                  </div>
                  <div className="text-right font-bold max-sm:text-center">{item.score}</div>
                  <div className="text-right text-[12px] text-[#555] max-sm:hidden">{formatTime(item.created_at)}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

