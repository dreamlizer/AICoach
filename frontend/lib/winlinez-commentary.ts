export type WinlinezCommentaryEvent =
  | "move"
  | "moveScore"
  | "nextDrop"
  | "rerollPreview"
  | "randomClear"
  | "shuffle"
  | "shuffleClear"
  | "precisionClear";

type CommentaryPayload = {
  score?: number;
  to?: string;
  cleared?: number;
  lines?: number;
  dryStreak?: number;
  hotStreak?: number;
};

type GameOverPayload = {
  score: number;
  totalPlays: number;
  isNewBest: boolean;
};

function pickOne<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

export function createWinlinezGameOverMessage(payload: GameOverPayload) {
  const score = Math.max(0, Number(payload.score || 0));
  const totalPlays = Math.max(1, Number(payload.totalPlays || 1));
  const isNewBest = Boolean(payload.isNewBest);

  if (isNewBest && totalPlays >= 15) {
    return pickOne([
      `第 ${totalPlays} 局迎来新高分 ${score}，这就是坚持的回报！`,
      `玩到第 ${totalPlays} 局刷新纪录 ${score} 分，太强了！`,
      `第 ${totalPlays} 局破个人纪录，${score} 分实至名归！`,
      `稳扎稳打到第 ${totalPlays} 局，终于冲出新高 ${score}！`,
      `超过 15 局后还能破纪录，${score} 分含金量很高！`,
      `第 ${totalPlays} 局再创新高 ${score}，状态真的越来越好了！`,
    ]);
  }

  if (isNewBest) {
    return pickOne([
      `新纪录诞生：${score} 分，漂亮！`,
      `恭喜刷新个人最好成绩：${score} 分！`,
      `这局打出新高 ${score}，继续保持！`,
      `个人最高分更新到 ${score}，很强！`,
      `新高到手，${score} 分值得庆祝！`,
      `今天手感在线，直接把纪录抬到 ${score}！`,
    ]);
  }

  if (score >= 120) {
    return pickOne([
      `高分局！${score} 分，离新纪录只差临门一脚。`,
      `${score} 分的质量非常高，节奏已经很成熟了。`,
      `这把 ${score} 分很硬，下把冲纪录就对了。`,
      `稳稳打到 ${score}，顶级发挥继续保持。`,
      `${score} 分属于高水准局，下一局继续冲。`,
      `高分收官 ${score}，你的盘感已经出来了。`,
    ]);
  }

  if (score >= 70) {
    return pickOne([
      `${score} 分，不错的一局，思路很清晰。`,
      `中高分 ${score} 到手，再稳一点就能更高。`,
      `这把 ${score} 分很扎实，继续加油。`,
      `${score} 分完成度很高，下一把有机会爆发。`,
      `打到 ${score} 分，说明节奏已经找到了。`,
      `这局 ${score} 分表现不错，离高分区很近。`,
    ]);
  }

  if (score >= 30) {
    return pickOne([
      `${score} 分，基础节奏已经建立起来了。`,
      `${score} 分稳稳拿下，继续练手感会更快提升。`,
      `这把 ${score} 分是个好起点，下一把会更好。`,
      `${score} 分到手，布局思路越来越顺。`,
      `这局 ${score} 分，继续保持耐心就能再上台阶。`,
      `不错，${score} 分打底，下一局冲更高。`,
    ]);
  }

  return pickOne([
    `这局 ${score} 分，别急，下一把我们再来。`,
    `分数是 ${score}，先把节奏稳住就会提升。`,
    `${score} 分只是热身，马上开下一局。`,
    `先收下 ${score} 分，后面会越来越顺。`,
    `这把当练手，${score} 分不影响下局爆发。`,
    `别灰心，${score} 分也在积累盘感。`,
  ]);
}

export function createWinlinezCommentary(event: WinlinezCommentaryEvent, payload?: CommentaryPayload) {
  const score = Number(payload?.score ?? 0);
  const to = String(payload?.to ?? "");
  const cleared = Number(payload?.cleared ?? 0);
  const lines = Number(payload?.lines ?? 0);
  const dryStreak = Number(payload?.dryStreak ?? 0);
  const hotStreak = Number(payload?.hotStreak ?? 0);

  if (event === "nextDrop") {
    if (dryStreak >= 4) {
      return pickOne([
        `连续 ${dryStreak} 回合还没开线，别急，我们下一手稳一点。`,
        `${dryStreak} 回合暂时没分，机会还在，继续加油。`,
        `已经 ${dryStreak} 回合空过了，下一步盯住一条主线。`,
        `先稳住，连续 ${dryStreak} 回合无消除也不代表要崩。`,
        `这段有点卡，但你完全能从第 ${dryStreak} 回合后翻回来。`,
        `连续 ${dryStreak} 回合没起势，下一手从安全位慢慢搭线。`,
      ]);
    }
    if (dryStreak >= 3) {
      return pickOne([
        `连续 ${dryStreak} 回合未消除，稳住节奏就能破局。`,
        "三回合没开分了，下一手优先找 4 连潜力位。",
        "这一段有点胶着，别慌，机会马上会出来。",
        "连续三回合空过没关系，下一波很可能就连上。",
        "先别冒进，三回合后更要走稳手。",
        "这几回合在蓄力，下一手争取直接开线。",
      ]);
    }
  }

  if (event === "moveScore") {
    if (cleared >= 8) {
      return pickOne([
        `神级一手！${cleared} 连消，分数直接拉开。`,
        `${cleared} 颗一起清掉，这波太炸裂了！`,
        `超高光操作，${cleared} 连消打穿盘面。`,
        `${cleared} 连消到手，这就是顶级回合。`,
        `一口气清 ${cleared} 颗，现场级名场面！`,
      ]);
    }
    if (cleared >= 7) {
      return pickOne([
        `大爆发！一次清掉 ${cleared} 颗，+${score} 分！`,
        `${cleared} 连消直接起飞，漂亮收下 +${score}。`,
        `高质量一波，${cleared} 颗落袋，分数大涨。`,
        `${cleared} 连消非常稀有，这手价值拉满。`,
        `这手 ${cleared} 连消，质量非常高！`,
      ]);
    }
    if (cleared >= 6) {
      return pickOne([
        `${cleared} 颗连消，手感很热，+${score}。`,
        `一口气清 ${cleared} 颗，这手很硬！`,
        `${cleared} 子连动打成，继续把分数拉开。`,
        `${cleared} 连消很漂亮，局势开始倾斜。`,
        `${cleared} 颗的中大连消，节奏完全起来了。`,
      ]);
    }
    if (hotStreak >= 3) {
      return pickOne([
        `连续 ${hotStreak} 回合都有消除，状态拉满！`,
        `${hotStreak} 连消节奏，盘面已经被你控住了。`,
        `第 ${hotStreak} 回合连消到手，压制力很强。`,
      ]);
    }
    if (hotStreak >= 2) {
      return pickOne([
        "连续两回合得分，节奏起来了。",
        "第二波也打成了，手感在线。",
        "连消还在继续，保持这个势头。",
      ]);
    }
  }

  const pool: Record<WinlinezCommentaryEvent, string[]> = {
    move: [`落子到 ${to}，走位很稳。`, `这一手推进到 ${to}。`, `棋子滑到 ${to}，节奏在线。`],
    moveScore: [`漂亮，+${score} 分！`, `连成 ${lines} 线，拿下 +${score}。`, `清掉 ${cleared} 颗，+${score} 到手。`],
    nextDrop: ["本回合未消除，下一组三球已落盘。", "新三球已进场，继续组织下一波。", "暂时没得分，但局面还在你手里。"],
    rerollPreview: ["下组颜色已刷新，机会来了。", "预告球重置成功，继续布局。", "这一刷很关键，路线更顺了。", "新颜色到位，准备连线。"],
    randomClear: [
      `道具生效，随机清除 ${cleared} 颗。`,
      "随机消除出手，盘面腾出空间。",
      `小爆发清场，移除了 ${cleared} 颗。`,
      `运气不错，这波随机清得很值。`,
    ],
    shuffle: ["全盘洗牌完成，格局重开。", "棋面打乱，新的机会出现了。", "洗牌成功，准备重新组织连线。", "这一洗，盘面节奏完全变了。"],
    shuffleClear: [`洗牌后触发消除，+${score} 分！`, `神之一洗，马上清线 +${score}。`, `重排后连线成立，稳拿 +${score}。`, `洗牌出奇效，额外进账 +${score}。`],
    precisionClear: ["精准清除命中，关键点拿掉了。", "点杀成功，这颗棋子已移除。", "手术刀级操作，精准清除完成。", "精准道具生效，局面更清爽了。"],
  };

  return pickOne(pool[event]);
}

