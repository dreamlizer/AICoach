import { execute, queryAll, withTransaction } from "./core";

export type AssessmentRow = {
  id: number;
  user_id: number;
  type: string;
  title: string | null;
  result: string;
  metadata: string | null;
  created_at: string;
};

export const listAssessmentsForUser = async (userId: number, type?: string | null) => {
  if (type) {
    return await queryAll<AssessmentRow>(
      "SELECT * FROM assessments WHERE user_id = ? AND type = ? ORDER BY created_at DESC",
      [userId, type]
    );
  }

  return await queryAll<AssessmentRow>("SELECT * FROM assessments WHERE user_id = ? ORDER BY created_at DESC", [userId]);
};

export const saveAssessmentForUser = async (params: {
  userId: number;
  type: string;
  title?: string | null;
  result: unknown;
  metadata?: unknown;
}) => {
  const { userId, type, title, result, metadata } = params;
  const now = new Date().toISOString();
  await execute("INSERT INTO assessments (user_id, type, title, result, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)", [
    userId,
    type,
    title || `${type} Assessment`,
    typeof result === "string" ? result : JSON.stringify(result),
    typeof metadata === "string" ? metadata : JSON.stringify(metadata),
    now,
  ]);
};

export const deleteAssessmentsForUser = async (userId: number, ids: number[]) => {
  return await withTransaction(async () => {
    let deletedCount = 0;
    for (const id of ids) {
      const result = await execute("DELETE FROM assessments WHERE id = ? AND user_id = ?", [id, userId]);
      deletedCount += result.changes;
    }
    return deletedCount;
  });
};

export const deleteAssessmentsByUserId = async (userId: number) => {
  const result = await execute("DELETE FROM assessments WHERE user_id = ?", [userId]);
  return result.changes;
};
