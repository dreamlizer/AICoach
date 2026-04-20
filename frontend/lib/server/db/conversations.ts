import { execute, queryAll, queryOne } from "./core";

const SHORT_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

const randomShortCode = (length = 8) => {
  let value = "";
  for (let i = 0; i < length; i += 1) {
    value += SHORT_CODE_CHARS[Math.floor(Math.random() * SHORT_CODE_CHARS.length)];
  }
  return value;
};

const generateUniqueShortCode = async () => {
  for (let i = 0; i < 12; i += 1) {
    const code = randomShortCode(8);
    const exists = await queryOne<{ v: number }>("SELECT 1 as v FROM conversations WHERE short_code = ? LIMIT 1", [code]);
    if (!exists) return code;
  }
  return `${Date.now().toString(36).slice(-4)}${randomShortCode(4)}`;
};

export const createConversation = async (
  id: string,
  title: string,
  toolId: string | null = null,
  userId: number | null = null
) => {
  const exists = await queryOne<{ v: number }>("SELECT 1 as v FROM conversations WHERE id = ?", [id]);
  if (!exists) {
    const now = new Date().toISOString();
    await execute(
      "INSERT INTO conversations (id, title, created_at, updated_at, tool_id, user_id, short_code) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, title, now, now, toolId, userId, await generateUniqueShortCode()]
    );
  }
};

export const updateConversationTitle = async (id: string, newTitle: string) => {
  await execute("UPDATE conversations SET title = ? WHERE id = ?", [newTitle, id]);
};

export const updateConversationTool = async (id: string, toolId: string | null) => {
  await execute("UPDATE conversations SET tool_id = ? WHERE id = ?", [toolId, id]);
};

export const getConversationsFromDb = async (userId: number | null = null) => {
  let sql = "SELECT id, short_code, title, created_at, updated_at, tool_id FROM conversations";
  const params: (number | null)[] = [];

  if (userId) {
    sql += " WHERE user_id = ?";
    params.push(userId);
  } else {
    sql += " WHERE user_id IS NULL";
  }

  sql += " ORDER BY updated_at DESC LIMIT 50";
  return await queryAll<{
    id: string;
    short_code?: string | null;
    title: string;
    created_at: string;
    updated_at: string;
    tool_id: string | null;
  }>(sql, params);
};

export const getConversationById = async (id: string) => {
  return (await queryOne<{ id: string; short_code?: string | null; user_id: number | null; title: string }>(
    "SELECT * FROM conversations WHERE id = ?",
    [id]
  )) as { id: string; short_code?: string | null; user_id: number | null; title: string } | undefined;
};

export const getConversationByShortCode = async (shortCode: string) => {
  return (await queryOne<{ id: string; short_code?: string | null; user_id: number | null; title: string }>(
    "SELECT * FROM conversations WHERE short_code = ?",
    [shortCode]
  )) as { id: string; short_code?: string | null; user_id: number | null; title: string } | undefined;
};

export const claimConversationForUser = async (conversationId: string, userId: number) => {
  const conversation = await queryOne<{ id: string; user_id: number | null }>(
    "SELECT id, user_id FROM conversations WHERE id = ?",
    [conversationId]
  );

  if (!conversation) {
    return { status: "not_found" as const };
  }

  if (conversation.user_id && conversation.user_id !== userId) {
    return { status: "claimed_by_other" as const };
  }

  if (conversation.user_id === userId) {
    return { status: "already_claimed" as const };
  }

  await execute("UPDATE conversations SET user_id = ? WHERE id = ?", [userId, conversationId]);
  return { status: "claimed" as const };
};

export const resolveConversationId = async (value: string) => {
  const byId = await getConversationById(value);
  if (byId) return byId.id;
  const byShort = await getConversationByShortCode(value);
  return byShort?.id || null;
};

export const saveMessageToDb = async (
  conversationId: string,
  role: "user" | "ai",
  content: string,
  kind: "text" | "analysis" = "text",
  metadata: string | null = null,
  userId: number | null = null,
  initialTitle: string | null = null,
  initialToolId: string | null = null
) => {
  const conv = await queryOne<{ user_id: number | null }>("SELECT user_id FROM conversations WHERE id = ?", [conversationId]);

  if (!conv) {
    let title = initialTitle;
    if (!title) {
      title = role === "user" ? content.slice(0, 20) + (content.length > 20 ? "..." : "") : "New Chat";
    }
    await createConversation(conversationId, title, initialToolId, userId);
  } else if (userId && conv.user_id === null) {
    await execute("UPDATE conversations SET user_id = ? WHERE id = ?", [userId, conversationId]);
  }

  const now = new Date().toISOString();
  await execute("INSERT INTO messages (conversation_id, role, content, created_at, kind, metadata) VALUES (?, ?, ?, ?, ?, ?)", [
    conversationId,
    role,
    content,
    now,
    kind,
    metadata,
  ]);
  await execute("UPDATE conversations SET updated_at = ? WHERE id = ?", [now, conversationId]);
};

export const getMessagesFromDb = async (conversationId: string, limit = 10) => {
  const rows = await queryAll<{
    id: number;
    role: string;
    content: string;
    created_at: string;
    kind: string;
    metadata: string | null;
  }>(
    "SELECT id, role, content, created_at, kind, metadata FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?",
    [conversationId, limit]
  );
  return rows.reverse();
};

export const countUserMessages = async (conversationId: string) => {
  const result = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM messages WHERE conversation_id = ? AND role = 'user'",
    [conversationId]
  );
  return result ? Number(result.count || 0) : 0;
};

export const deleteConversation = async (id: string) => {
  await execute("DELETE FROM messages WHERE conversation_id = ?", [id]);
  await execute("DELETE FROM conversations WHERE id = ?", [id]);
};

export const searchMessages = async (query: string, userId: number | null = null) => {
  let sql = `
    SELECT
      m.id as message_id,
      m.conversation_id,
      m.content,
      m.created_at,
      c.title as conversation_title
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE (m.content LIKE ? OR c.title LIKE ?)
  `;
  const params: (string | number)[] = [`%${query}%`, `%${query}%`];

  if (userId) {
    sql += " AND c.user_id = ?";
    params.push(userId);
  } else {
    sql += " AND c.user_id IS NULL";
  }

  sql += " ORDER BY m.created_at DESC LIMIT 50";
  return await queryAll<{
    message_id: number;
    conversation_id: string;
    content: string;
    created_at: string;
    conversation_title: string;
  }>(sql, params);
};
