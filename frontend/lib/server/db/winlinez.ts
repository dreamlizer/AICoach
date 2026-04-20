import { execute, queryAll } from "./core";
import { WinlinezGameRecord, summarizeWinlinezRecords } from "@/lib/winlinez";

type SaveWinlinezScoreInput = {
  userId: number;
  score: number;
  linesCleared: number;
  ballsCleared: number;
  movesPlayed: number;
  pieceStyle: string;
  metadata?: string | null;
};

export async function saveWinlinezScoreToDb(input: SaveWinlinezScoreInput) {
  const now = new Date().toISOString();
  const result = await execute(
    `INSERT INTO winlinez_scores
      (user_id, score, lines_cleared, balls_cleared, moves_played, piece_style, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.userId,
      input.score,
      input.linesCleared,
      input.ballsCleared,
      input.movesPlayed,
      input.pieceStyle,
      input.metadata || null,
      now,
    ]
  );

  return {
    id: Number(result.lastInsertId || 0),
    created_at: now,
  };
}

export async function getWinlinezScoresForUser(userId: number, limit = 20) {
  return await queryAll<{
    id: number;
    score: number;
    lines_cleared: number;
    balls_cleared: number;
    moves_played: number;
    piece_style: string;
    metadata: string | null;
    created_at: string;
  }>(
    `SELECT id, score, lines_cleared, balls_cleared, moves_played, piece_style, metadata, created_at
       FROM winlinez_scores
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    [userId, limit]
  );
}

export async function getWinlinezSummaryForUser(userId: number) {
  const rows = await getWinlinezScoresForUser(userId, 200);
  const records: WinlinezGameRecord[] = rows.map((row) => ({
    id: row.id,
    score: row.score,
    linesCleared: row.lines_cleared,
    ballsCleared: row.balls_cleared,
    movesPlayed: row.moves_played,
    pieceStyle: row.piece_style === "glyph" ? "glyph" : "orb",
    aidLevel: (() => {
      try {
        const meta = row.metadata ? JSON.parse(row.metadata) : null;
        const aid = meta?.aidLevel;
        return aid === "assist" || aid === "boost" ? aid : "none";
      } catch {
        return "none";
      }
    })(),
    created_at: row.created_at,
  }));
  return summarizeWinlinezRecords(records);
}

export async function deleteWinlinezScoreById(userId: number, scoreId: number) {
  const result = await execute(
    `DELETE FROM winlinez_scores
       WHERE id = ? AND user_id = ?`,
    [scoreId, userId]
  );
  return result.changes;
}

export type WinlinezLeaderboardItem = {
  userId: number;
  userName: string;
  avatar?: string | null;
  score: number;
  created_at: string;
  aidLevel: "none" | "assist" | "boost";
};

function aidFilterSql(level: "none" | "assist" | "boost") {
  if (level === "none") {
    return `(metadata IS NULL OR metadata = '' OR metadata LIKE '%"aidLevel":"none"%')`;
  }
  return `metadata LIKE '%"aidLevel":"${level}"%'`;
}

export async function getWinlinezLeaderboard(limit = 10, aidLevel: "none" | "assist" | "boost" = "none") {
  const filter = aidFilterSql(aidLevel);
  const rows = await queryAll<{
    user_id: number;
    user_name: string | null;
    user_avatar: string | null;
    score: number;
    created_at: string;
  }>(
    `SELECT ws.user_id, u.name AS user_name, u.avatar AS user_avatar, ws.score, ws.created_at
       FROM winlinez_scores ws
       LEFT JOIN users u ON u.id = ws.user_id
      WHERE ${filter}
        AND ws.id = (
          SELECT s3.id
            FROM winlinez_scores s3
           WHERE s3.user_id = ws.user_id
             AND ${filter.replaceAll("metadata", "s3.metadata")}
           ORDER BY s3.score DESC, s3.created_at ASC, s3.id ASC
           LIMIT 1
        )
      ORDER BY ws.score DESC, ws.created_at ASC, ws.id ASC
      LIMIT ?`,
    [limit]
  );

  return rows.map((row) => ({
    userId: row.user_id,
    userName: row.user_name?.trim() || `玩家#${row.user_id}`,
    avatar: row.user_avatar,
    score: row.score,
    created_at: row.created_at,
    aidLevel,
  })) as WinlinezLeaderboardItem[];
}
