# 数据库写入地图（Write Map）

本文件是“施工前测绘”，仅盘点写入路径，不改任何 SQL 行为、业务逻辑或 API 返回。

## 1. 范围与判定标准

- 盘点范围：`frontend` 下所有 SQLite/better-sqlite3 写操作
- 计入写操作类型：
  - `CREATE`（建表/索引/初始化）
  - `ALTER`（字段补齐迁移）
  - `INSERT`
  - `UPDATE`
  - `DELETE`
- 调用链关键性分级：
  - **关键写入**：位于用户主请求链路（聊天、登录注册、资料更新、删除会话等）
  - **非关键写入**：统计、埋点、后台维护类

---

## 2. 写操作清单（按函数/调用点）

### 2.1 `lib/db.ts`

文件：[db.ts](file:///g:/Trea/AICoach/frontend/lib/db.ts)

| 函数/位置 | 写入表 | 写入类型 | 主请求链路关键写入 | 失败影响 | 建议归类 |
|---|---|---|---|---|---|
| `initializeSchema` | `conversations/messages/user_profiles/users/usage_stats/daily_usage_stats/daily_tool_usage/verification_codes/login_attempts/user_stats/tool_usage/analytics_events/assessments` | CREATE | 否（启动阶段） | 服务启动后首次初始化/迁移失败会影响部分功能可用性 | 暂时不要动 |
| `initializeSchema`（字段补齐） | `users/messages/conversations/user_stats` | ALTER | 否（启动阶段） | 迁移失败可能导致后续读写异常 | 暂时不要动 |
| `initializeSchema`（旧库合并） | `usage_stats/daily_usage_stats/daily_tool_usage` | INSERT | 否（一次性迁移） | 统计数据可能不完整 | 暂时不要动 |
| `initializeSchema`（旧库重命名） | 文件系统 `token_stats.db -> .migrated` | 文件写 | 否 | 仅影响旧统计迁移标记 | 暂时不要动 |
| `createConversation` | `conversations` | INSERT | 是（会话创建） | 会话无法建立，后续消息保存失败 | 必须保持同步 |
| `updateConversationTitle` | `conversations` | UPDATE | 是（标题更新） | 标题不更新，不影响消息主流程 | 可以考虑异步 |
| `updateConversationTool` | `conversations` | UPDATE | 是（工具标记） | 工具归属不准确，主聊天可继续 | 可以考虑异步 |
| `saveVerificationCode` | `verification_codes` | INSERT | 是（登录/注册发码） | 用户无法完成验证码流程 | 必须保持同步 |
| `recordLoginAttempt` | `login_attempts` | INSERT | 是（登录失败限流） | 限流审计失真 | 可以考虑异步 |
| `clearLoginAttempts` | `login_attempts` | DELETE | 是（登录成功后清理） | 可能导致后续误限流 | 可以考虑异步 |
| `verifyCode`（成功路径） | `verification_codes` | DELETE | 是（登录/注册/重置） | 验证码复用风险上升 | 必须保持同步 |
| `getOrCreateUser` | `users` | INSERT/UPDATE | 是（登录/注册路径） | 无法创建或回填用户信息 | 必须保持同步 |
| `createUserWithPassword` | `users` | INSERT | 是（注册核心） | 注册失败 | 必须保持同步 |
| `clearUserPasswordById` | `users` | UPDATE | 否（后台管理） | 管理动作不生效 | 暂时不要动 |
| `deleteUserById`（事务） | `messages/conversations/assessments/analytics_events/tool_usage/user_stats/login_attempts/verification_codes/users` | DELETE | 否（后台管理） | 删除不完整/数据残留 | 暂时不要动 |
| `updateUserPassword` | `users` | UPDATE | 是（重置密码） | 密码更新失败 | 必须保持同步 |
| `updateUserProfile` | `users` | UPDATE | 是（用户资料） | 资料更新失败 | 必须保持同步 |
| `saveMessageToDb` | `conversations/messages` | INSERT/UPDATE | 是（聊天核心） | 消息丢失/会话时间不更新 | 必须保持同步 |
| `deleteConversation` | `messages/conversations` | DELETE | 是（删除会话） | 会话删除失败或脏数据 | 必须保持同步 |
| `saveUserProfileToDb` | `user_profiles` | INSERT | 否（画像存档） | 画像历史缺失 | 可以考虑异步 |
| `incrementUserTokens` | `user_stats` | INSERT/UPDATE | 否（统计） | Token 统计偏差 | 可以考虑异步 |
| `incrementToolUsage` | `tool_usage` | INSERT/UPDATE | 否（统计） | 工具统计偏差 | 可以考虑异步 |
| `trackEvent` | `analytics_events` | INSERT | 否（埋点） | 埋点丢失 | 可以考虑异步 |

---

### 2.2 `lib/stats_db.ts`

文件：[stats_db.ts](file:///g:/Trea/AICoach/frontend/lib/stats_db.ts)

| 函数/位置 | 写入表 | 写入类型 | 主请求链路关键写入 | 失败影响 | 建议归类 |
|---|---|---|---|---|---|
| `incrementTokenStats`（事务） | `usage_stats` | INSERT/UPDATE | 否（统计） | 总体统计偏差 | 可以考虑异步 |
| `incrementTokenStats`（事务） | `daily_usage_stats` | INSERT/UPDATE | 否（限额/看板统计） | 日统计与限额判断偏差 | 暂时不要动 |
| `incrementTokenStats`（事务，带 toolId） | `daily_tool_usage` | INSERT/UPDATE | 否（工具频次统计） | 工具频次偏差 | 可以考虑异步 |

---

### 2.3 直接 SQL 写入（路由文件内）

| 文件 | 函数 | 写入表 | 写入类型 | 主请求链路关键写入 | 失败影响 | 建议归类 |
|---|---|---|---|---|---|
| [auth/update-password/route.ts](file:///g:/Trea/AICoach/frontend/app/api/auth/update-password/route.ts) | `POST` | `users` | UPDATE | 是 | 用户无法修改密码 | 必须保持同步 |
| [assessment/history/route.ts](file:///g:/Trea/AICoach/frontend/app/api/assessment/history/route.ts) | `POST` | `assessments` | INSERT | 是（评测结果保存） | 历史评测丢失 | 必须保持同步 |
| [assessment/history/route.ts](file:///g:/Trea/AICoach/frontend/app/api/assessment/history/route.ts) | `DELETE` | `assessments` | DELETE | 是（评测历史管理） | 删除不生效 | 必须保持同步 |
| [conversations/merge/route.ts](file:///g:/Trea/AICoach/frontend/app/api/conversations/merge/route.ts) | `POST` | `conversations` | UPDATE | 是（匿名会话归属） | 登录后会话归并失败 | 必须保持同步 |

---

## 3. 关键调用点地图（谁在触发写入）

### 3.1 聊天主链路

- 文件：[chat_service.ts](file:///g:/Trea/AICoach/frontend/lib/chat_service.ts#L103-L112)
  - 入站先写：`saveMessageToDb(..., "user", ...)`
- 文件：[chat_service.ts](file:///g:/Trea/AICoach/frontend/lib/chat_service.ts#L375-L385)
  - 每次回复后写：`incrementTokenStats(...)`
- 文件：[chat_service.ts](file:///g:/Trea/AICoach/frontend/lib/chat_service.ts#L412-L420)
  - 出站写：`saveMessageToDb(..., "ai", "analysis/text", ...)`
- 文件：[chat_service.ts](file:///g:/Trea/AICoach/frontend/lib/chat_service.ts#L424-L428)
  - 可能更新标题：`updateConversationTitle(...)`

### 3.2 认证链路

- 发验证码：[send-code/route.ts](file:///g:/Trea/AICoach/frontend/app/api/auth/send-code/route.ts#L34-L39) -> `saveVerificationCode`
- 验证码登录：[login/route.ts](file:///g:/Trea/AICoach/frontend/app/api/auth/login/route.ts#L16-L27) -> `verifyCode`, `clearLoginAttempts`
- 密码登录失败记录：[auth-helpers.ts](file:///g:/Trea/AICoach/frontend/lib/auth-helpers.ts#L38-L40) -> `recordLoginAttempt`
- 注册：[register/route.ts](file:///g:/Trea/AICoach/frontend/app/api/auth/register/route.ts#L20-L34) -> `verifyCode`, `createUserWithPassword`
- 重置密码：[reset-password/route.ts](file:///g:/Trea/AICoach/frontend/app/api/auth/reset-password/route.ts#L20-L33) -> `verifyCode`, `updateUserPassword`
- 修改密码：[update-password/route.ts](file:///g:/Trea/AICoach/frontend/app/api/auth/update-password/route.ts#L39-L41) -> `UPDATE users`

### 3.3 会话链路

- 新建/更新会话信息：[conversation/route.ts](file:///g:/Trea/AICoach/frontend/app/api/conversation/route.ts#L15-L17)
- 删除会话：[history/[id]/route.ts](file:///g:/Trea/AICoach/frontend/app/api/history/%5Bid%5D/route.ts#L21-L23)
- 登录后归并匿名会话：[conversations/merge/route.ts](file:///g:/Trea/AICoach/frontend/app/api/conversations/merge/route.ts#L37-L40)

### 3.4 后台管理链路

- 清空用户密码：[admin/users/[id]/route.ts](file:///g:/Trea/AICoach/frontend/app/api/admin/users/%5Bid%5D/route.ts#L16-L17)
- 删除用户（级联删除）：[admin/users/[id]/route.ts](file:///g:/Trea/AICoach/frontend/app/api/admin/users/%5Bid%5D/route.ts#L31-L32)

---

## 4. 未来优先优化建议（仅测绘结论，不执行变更）

### 4.1 最值得优先优化的 3 个写入点

1. `incrementTokenStats`（`stats_db.ts`）
   - 原因：高频写 + 多表事务，属于写放大热点。
2. `saveMessageToDb`（`db.ts`，聊天主链路）
   - 原因：每轮对话多次调用，写入压力最大且直接影响体验。
3. `deleteUserById`（`db.ts`，后台管理）
   - 原因：多表删除事务，长事务风险高，需重点审计与压测。

### 4.2 目前绝对不该动的 3 个写入点

1. `verifyCode` 的“验证成功即删除验证码”
   - 安全关键，改动风险高。
2. `createUserWithPassword`（注册核心写入）
   - 认证核心路径，稳定性优先。
3. `saveMessageToDb`（用户/AI 消息落库）
   - 聊天核心链路，任何行为变化都可能导致消息丢失或顺序问题。

---

## 5. 本次改动说明

- 本次仅新增测绘文档：
  - [write-map.md](file:///g:/Trea/AICoach/frontend/write-map.md)
- 未修改数据库表结构
- 未修改 SQL 执行逻辑
- 未调整同步/异步行为
- 未修改 API 返回
