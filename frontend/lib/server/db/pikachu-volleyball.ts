import { execute, queryAll } from "./core";

type SavePikachuScoreInput = {
  userId: number;
  p1Score: number;
  p2Score: number;
  winningScore: number;
  difficulty: "low" | "normal" | "high";
  themeId: string;
  themePreviewSrc: string;
  metadata?: string | null;
};

export async function savePikachuVolleyballScoreToDb(input: SavePikachuScoreInput) {
  const now = new Date().toISOString();
  const result = await execute(
    `INSERT INTO pikachu_volleyball_scores
      (user_id, p1_score, p2_score, winning_score, difficulty, theme_id, theme_preview_src, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.userId,
      input.p1Score,
      input.p2Score,
      input.winningScore,
      input.difficulty,
      input.themeId,
      input.themePreviewSrc,
      input.metadata || null,
      now,
    ]
  );

  return {
    id: Number(result.lastInsertId || 0),
    created_at: now,
  };
}

export async function getPikachuVolleyballScoresForUser(userId: number, limit = 50) {
  return await queryAll<{
    id: number;
    p1_score: number;
    p2_score: number;
    winning_score: number;
    difficulty: "low" | "normal" | "high";
    theme_id: string;
    theme_preview_src: string;
    metadata: string | null;
    created_at: string;
  }>(
    `SELECT
       id,
       p1_score,
       p2_score,
       winning_score,
       difficulty,
       theme_id,
       theme_preview_src,
       metadata,
       created_at
     FROM pikachu_volleyball_scores
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit]
  );
}
