import { deleteAssessmentsByUserId } from "./assessments";
import { User, execute, queryAll, queryOne, withTransaction } from "./core";

export const saveVerificationCode = async (email: string, code: string) => {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const createdAt = new Date().toISOString();
  await execute("INSERT INTO verification_codes (email, code, expires_at, created_at) VALUES (?, ?, ?, ?)", [
    email,
    code,
    expiresAt,
    createdAt,
  ]);
};

export const getRecentVerificationCodeCount = async (email: string, windowMs: number) => {
  const since = new Date(Date.now() - windowMs).toISOString();
  const result = await queryOne<{ count: number }>(
    "SELECT COUNT(1) as count FROM verification_codes WHERE email = ? AND created_at >= ?",
    [email, since]
  );
  return Number(result?.count || 0);
};

export const recordLoginAttempt = async (email: string, success: boolean) => {
  await execute("INSERT INTO login_attempts (email, success, created_at) VALUES (?, ?, ?)", [
    email,
    success ? 1 : 0,
    new Date().toISOString(),
  ]);
};

export const getRecentLoginFailureCount = async (email: string, windowMs: number) => {
  const since = new Date(Date.now() - windowMs).toISOString();
  const result = await queryOne<{ count: number }>(
    "SELECT COUNT(1) as count FROM login_attempts WHERE email = ? AND success = 0 AND created_at >= ?",
    [email, since]
  );
  return Number(result?.count || 0);
};

export const clearLoginAttempts = async (email: string) => {
  await execute("DELETE FROM login_attempts WHERE email = ?", [email]);
};

export const verifyCode = async (email: string, code: string): Promise<boolean> => {
  const now = new Date().toISOString();
  const record = await queryOne<{ id: number }>(
    "SELECT id FROM verification_codes WHERE email = ? AND code = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
    [email, code, now]
  );

  if (record?.id) {
    await execute("DELETE FROM verification_codes WHERE id = ?", [record.id]);
    return true;
  }
  return false;
};

export const getOrCreateUser = async (email: string, name?: string): Promise<User> => {
  const now = new Date().toISOString();
  let user = await queryOne<User>("SELECT * FROM users WHERE email = ?", [email]);

  if (!user) {
    await execute("INSERT INTO users (email, name, created_at) VALUES (?, ?, ?)", [email, name || email.split("@")[0], now]);
    user = (await queryOne<User>("SELECT * FROM users WHERE email = ?", [email])) || undefined;
  } else if (name && !user.name) {
    await execute("UPDATE users SET name = ? WHERE id = ?", [name, user.id]);
    user = { ...user, name };
  }

  if (!user) {
    throw new Error("Failed to create user");
  }

  return user;
};

export const createUserWithPassword = async (
  email: string,
  passwordHash: string,
  name: string
): Promise<User | undefined> => {
  const now = new Date().toISOString();

  try {
    await execute("INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)", [
      email,
      passwordHash,
      name,
      now,
    ]);
    return await queryOne<User>("SELECT * FROM users WHERE email = ?", [email]);
  } catch (err: any) {
    const message = String(err?.message || "");
    if (
      message.includes("UNIQUE constraint failed") ||
      message.includes("Duplicate entry") ||
      message.includes("ER_DUP_ENTRY")
    ) {
      throw new Error("User already exists");
    }
    throw err;
  }
};

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  return await queryOne<User>("SELECT * FROM users WHERE email = ?", [email]);
};

export const getUserById = async (userId: number): Promise<User | undefined> => {
  return await queryOne<User>("SELECT * FROM users WHERE id = ?", [userId]);
};

export const listUsersForAdmin = async () => {
  const rows = await queryAll<any>(`
      SELECT
        u.id,
        u.email,
        u.name,
        u.avatar,
        u.created_at,
        u.role,
        u.password_hash,
        COALESCE(c.conversations_count, 0) as conversations_count,
        COALESCE(a.assessments_count, 0) as assessments_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(1) as conversations_count
        FROM conversations
        WHERE user_id IS NOT NULL
        GROUP BY user_id
      ) c ON c.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(1) as assessments_count
        FROM assessments
        GROUP BY user_id
      ) a ON a.user_id = u.id
      ORDER BY u.created_at DESC
    `);

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    avatar: row.avatar,
    created_at: row.created_at,
    role: row.role,
    hasPassword: !!row.password_hash,
    conversationsCount: row.conversations_count || 0,
    assessmentsCount: row.assessments_count || 0,
  }));
};

export const clearUserPasswordById = async (userId: number) => {
  const result = await execute("UPDATE users SET password_hash = NULL WHERE id = ?", [userId]);
  return result.changes;
};

export const deleteUserById = async (userId: number) => {
  return await withTransaction(async () => {
    const conversationIds = await queryAll<{ id: string }>("SELECT id FROM conversations WHERE user_id = ?", [userId]);
    if (conversationIds.length > 0) {
      const ids = conversationIds.map((row) => row.id);
      const placeholders = ids.map(() => "?").join(",");
      await execute(`DELETE FROM messages WHERE conversation_id IN (${placeholders})`, ids);
      await execute(`DELETE FROM conversations WHERE id IN (${placeholders})`, ids);
    }

    await deleteAssessmentsByUserId(userId);
    await execute("DELETE FROM analytics_events WHERE user_id = ?", [userId]);
    await execute("DELETE FROM tool_usage WHERE user_id = ?", [userId]);
    await execute("DELETE FROM user_stats WHERE user_id = ?", [userId]);
    await execute("DELETE FROM login_attempts WHERE email IN (SELECT email FROM users WHERE id = ?)", [userId]);
    await execute("DELETE FROM verification_codes WHERE email IN (SELECT email FROM users WHERE id = ?)", [userId]);
    const deleted = await execute("DELETE FROM users WHERE id = ?", [userId]);
    return deleted.changes;
  });
};

export const updateUserPassword = async (userId: number, passwordHash: string) => {
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
};

export const updateUserProfile = async (
  userId: number,
  updates: { name?: string; avatar?: string }
): Promise<User | undefined> => {
  const { name, avatar } = updates;
  if (name !== undefined) {
    await execute("UPDATE users SET name = ? WHERE id = ?", [name, userId]);
  }
  if (avatar !== undefined) {
    await execute("UPDATE users SET avatar = ? WHERE id = ?", [avatar, userId]);
  }
  return await queryOne<User>("SELECT * FROM users WHERE id = ?", [userId]);
};

export const getUserFeatureOrder = async (userId: number): Promise<string | null> => {
  const row = await queryOne<{ feature_order_json?: string | null }>("SELECT feature_order_json FROM users WHERE id = ?", [userId]);
  return row?.feature_order_json ?? null;
};

export const updateUserFeatureOrder = async (userId: number, featureOrderJson: string) => {
  await execute("UPDATE users SET feature_order_json = ? WHERE id = ?", [featureOrderJson, userId]);
};
