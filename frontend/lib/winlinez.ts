export const WINLINEZ_BOARD_SIZE = 9;
export const WINLINEZ_PREVIEW_COUNT = 3;
export const WINLINEZ_MIN_LINE = 5;

export const WINLINEZ_COLORS = [
  { id: "green", hex: "#31d224", label: "Green" },
  { id: "blue", hex: "#1f33d6", label: "Blue" },
  { id: "cyan", hex: "#33d7dd", label: "Cyan" },
  { id: "purple", hex: "#c227d4", label: "Purple" },
  { id: "red", hex: "#dd1e17", label: "Red" },
  { id: "yellow", hex: "#d8d01c", label: "Yellow" },
  { id: "brown", hex: "#7c170f", label: "Brown" },
] as const;

export const WINLINEZ_PIECE_STYLES = ["orb", "glyph"] as const;

export type WinlinezPieceStyle = (typeof WINLINEZ_PIECE_STYLES)[number];

export type WinlinezPosition = {
  row: number;
  col: number;
};

export type WinlinezPiece = {
  id: string;
  colorIndex: number;
};

export type WinlinezCell = WinlinezPiece | null;
export type WinlinezBoard = WinlinezCell[][];

export type WinlinezLineMatch = {
  cells: WinlinezPosition[];
  colorIndex: number;
};

export type WinlinezSpawnResult = {
  board: WinlinezBoard;
  placed: WinlinezPosition[];
  gameOver: boolean;
};

export type WinlinezGameRecord = {
  id: number | string;
  score: number;
  linesCleared: number;
  ballsCleared: number;
  movesPlayed: number;
  pieceStyle: WinlinezPieceStyle;
  aidLevel?: "none" | "assist" | "boost";
  durationSec?: number;
  speedPreset?: "slow" | "normal" | "fast";
  themeId?: "retro" | "neon" | "frost" | "nova";
  toolUsage?: {
    clearRandom: number;
    shuffle: number;
    rerollPreview: number;
    clearTarget: number;
  };
  created_at: string;
};

export type WinlinezGameSummary = {
  bestScore: number;
  lastScore: number;
  totalPlays: number;
  averageScore: number;
};

let pieceSeed = 0;

function nextPieceId() {
  pieceSeed += 1;
  return `piece-${pieceSeed}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createPiece(colorIndex: number): WinlinezPiece {
  return {
    id: nextPieceId(),
    colorIndex,
  };
}

export function createEmptyBoard(): WinlinezBoard {
  return Array.from({ length: WINLINEZ_BOARD_SIZE }, () =>
    Array.from({ length: WINLINEZ_BOARD_SIZE }, () => null)
  );
}

export function cloneBoard(board: WinlinezBoard): WinlinezBoard {
  return board.map((row) => row.slice());
}

export function positionKey(position: WinlinezPosition) {
  return `${position.row}:${position.col}`;
}

export function isInsideBoard(position: WinlinezPosition) {
  return (
    position.row >= 0 &&
    position.row < WINLINEZ_BOARD_SIZE &&
    position.col >= 0 &&
    position.col < WINLINEZ_BOARD_SIZE
  );
}

export function getEmptyPositions(board: WinlinezBoard) {
  const empty: WinlinezPosition[] = [];
  for (let row = 0; row < WINLINEZ_BOARD_SIZE; row += 1) {
    for (let col = 0; col < WINLINEZ_BOARD_SIZE; col += 1) {
      if (!board[row][col]) {
        empty.push({ row, col });
      }
    }
  }
  return empty;
}

export function generatePreviewPieces(count = WINLINEZ_PREVIEW_COUNT) {
  return Array.from({ length: count }, () =>
    createPiece(Math.floor(Math.random() * WINLINEZ_COLORS.length))
  );
}

function shufflePositions(positions: WinlinezPosition[]) {
  const next = positions.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function spawnPreviewPieces(board: WinlinezBoard, preview: WinlinezPiece[]): WinlinezSpawnResult {
  const nextBoard = cloneBoard(board);
  const empty = shufflePositions(getEmptyPositions(nextBoard));
  const placed: WinlinezPosition[] = [];

  preview.forEach((piece, index) => {
    const target = empty[index];
    if (!target) return;
    nextBoard[target.row][target.col] = piece;
    placed.push(target);
  });

  return {
    board: nextBoard,
    placed,
    gameOver: getEmptyPositions(nextBoard).length === 0,
  };
}

export function getPieceAt(board: WinlinezBoard, position: WinlinezPosition) {
  return board[position.row]?.[position.col] || null;
}

export function canMovePiece(board: WinlinezBoard, from: WinlinezPosition, to: WinlinezPosition) {
  if (!isInsideBoard(from) || !isInsideBoard(to)) return false;
  if (!getPieceAt(board, from) || getPieceAt(board, to)) return false;

  const queue: WinlinezPosition[] = [from];
  const visited = new Set([positionKey(from)]);
  const directions = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.row === to.row && current.col === to.col) {
      return true;
    }

    directions.forEach((direction) => {
      const next = {
        row: current.row + direction.row,
        col: current.col + direction.col,
      };

      if (!isInsideBoard(next)) return;
      const key = positionKey(next);
      if (visited.has(key)) return;

      const isDestination = next.row === to.row && next.col === to.col;
      if (!isDestination && getPieceAt(board, next)) return;

      visited.add(key);
      queue.push(next);
    });
  }

  return false;
}

export function findPath(board: WinlinezBoard, from: WinlinezPosition, to: WinlinezPosition) {
  if (!isInsideBoard(from) || !isInsideBoard(to)) return null;
  const queue: WinlinezPosition[] = [from];
  const visited = new Set([positionKey(from)]);
  const parent = new Map<string, WinlinezPosition>();
  const dirs = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.row === to.row && cur.col === to.col) {
      const path: WinlinezPosition[] = [to];
      let cursor = to;
      while (!(cursor.row === from.row && cursor.col === from.col)) {
        const prev = parent.get(positionKey(cursor));
        if (!prev) break;
        path.push(prev);
        cursor = prev;
      }
      return path.reverse();
    }

    for (const d of dirs) {
      const next = { row: cur.row + d.row, col: cur.col + d.col };
      if (!isInsideBoard(next)) continue;
      const key = positionKey(next);
      if (visited.has(key)) continue;
      const isDestination = next.row === to.row && next.col === to.col;
      if (!isDestination && board[next.row][next.col]) continue;
      visited.add(key);
      parent.set(key, cur);
      queue.push(next);
    }
  }
  return null;
}

export function findReachableEmptyKeys(board: WinlinezBoard, from: WinlinezPosition) {
  if (!isInsideBoard(from)) return new Set<string>();
  const queue: WinlinezPosition[] = [from];
  const visited = new Set<string>([positionKey(from)]);
  const reachable = new Set<string>();
  const dirs = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  while (queue.length) {
    const cur = queue.shift()!;
    for (const d of dirs) {
      const next = { row: cur.row + d.row, col: cur.col + d.col };
      if (!isInsideBoard(next)) continue;
      const key = positionKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      if (board[next.row][next.col]) continue;
      reachable.add(key);
      queue.push(next);
    }
  }
  return reachable;
}

export function movePiece(board: WinlinezBoard, from: WinlinezPosition, to: WinlinezPosition) {
  const nextBoard = cloneBoard(board);
  nextBoard[to.row][to.col] = nextBoard[from.row][from.col];
  nextBoard[from.row][from.col] = null;
  return nextBoard;
}

export function findLineMatches(board: WinlinezBoard) {
  const directions = [
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: -1 },
  ];
  const matches: WinlinezLineMatch[] = [];
  const unique = new Map<string, WinlinezPosition>();

  for (let row = 0; row < WINLINEZ_BOARD_SIZE; row += 1) {
    for (let col = 0; col < WINLINEZ_BOARD_SIZE; col += 1) {
      const cell = board[row][col];
      if (!cell) continue;

      directions.forEach((direction) => {
        const prev = { row: row - direction.row, col: col - direction.col };
        if (isInsideBoard(prev)) {
          const prevCell = board[prev.row][prev.col];
          if (prevCell && prevCell.colorIndex === cell.colorIndex) {
            return;
          }
        }

        const cells: WinlinezPosition[] = [{ row, col }];
        let step = 1;

        while (true) {
          const next = { row: row + direction.row * step, col: col + direction.col * step };
          if (!isInsideBoard(next)) break;
          const nextCell = board[next.row][next.col];
          if (!nextCell || nextCell.colorIndex !== cell.colorIndex) break;
          cells.push(next);
          step += 1;
        }

        if (cells.length >= WINLINEZ_MIN_LINE) {
          matches.push({ cells, colorIndex: cell.colorIndex });
          cells.forEach((position) => {
            unique.set(positionKey(position), position);
          });
        }
      });
    }
  }

  return {
    lines: matches,
    uniqueCells: Array.from(unique.values()),
  };
}

export function clearCells(board: WinlinezBoard, positions: WinlinezPosition[]) {
  const nextBoard = cloneBoard(board);
  positions.forEach(({ row, col }) => {
    nextBoard[row][col] = null;
  });
  return nextBoard;
}

export function calculateMoveScore(removedCount: number, _lineCount: number) {
  if (removedCount < WINLINEZ_MIN_LINE) return 0;
  // Board is 9x9; for practical gameplay and clearer comparison,
  // score growth is capped at 9 removed balls in one settlement.
  const effectiveRemoved = Math.min(removedCount, WINLINEZ_BOARD_SIZE);
  // Classic Linez-style scoring: n * (n - 4), where n is removed balls.
  return effectiveRemoved * (effectiveRemoved - (WINLINEZ_MIN_LINE - 1));
}

export function summarizeWinlinezRecords(records: WinlinezGameRecord[]): WinlinezGameSummary {
  if (records.length === 0) {
    return {
      bestScore: 0,
      lastScore: 0,
      totalPlays: 0,
      averageScore: 0,
    };
  }

  const sorted = records
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const total = records.reduce((sum, record) => sum + record.score, 0);

  return {
    bestScore: records.reduce((max, record) => Math.max(max, record.score), 0),
    lastScore: sorted[0]?.score || 0,
    totalPlays: records.length,
    averageScore: Math.round(total / records.length),
  };
}
