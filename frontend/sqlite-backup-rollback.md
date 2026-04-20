# SQLite 备份与回退（人工可控）

## 1) 当前数据库文件路径如何确认

生产环境启动后，服务日志会输出当前实际连接路径：

`[DB] SQLite path: /absolute/path/to/sqlite.db`

该日志由数据库初始化时打印，用于确认当前连接的真实文件。

## 2) 部署前如何手动备份 sqlite.db

先确认源数据库路径（使用上面的启动日志），再执行手动备份脚本：

```bash
node scripts/backup-sqlite.mjs --source "/absolute/path/to/sqlite.db" --target "/absolute/path/to/backups/sqlite-2026-03-22T103000Z.predeploy.db"
```

脚本安全规则：

- 必须显式传入 `--source` 和 `--target`
- 源文件不存在会直接报错
- 目标文件已存在会直接报错
- 不会删除原文件
- 不会覆盖目标文件

## 3) 备份文件建议命名方式

建议格式：

`sqlite-YYYY-MM-DDTHHMMSSZ.<tag>.db`

示例：

- `sqlite-2026-03-22T103000Z.predeploy.db`
- `sqlite-2026-03-22T130500Z.before-hotfix.db`

## 4) 新版本异常时如何回退

1. 停止当前应用进程
2. 确认 `SQLITE_DB_PATH` 指向的生产数据库文件路径
3. 再备份一次当前线上库（保留事故现场）：

```bash
node scripts/backup-sqlite.mjs --source "/absolute/path/to/sqlite.db" --target "/absolute/path/to/backups/sqlite-2026-03-22T141000Z.before-rollback.db"
```

4. 使用操作系统命令把“已验证可用”的历史备份复制回生产路径（覆盖生产库文件）
5. 启动应用
6. 检查启动日志中的 `[DB] SQLite path: ...` 是否为预期路径
7. 进行核心功能验证（登录、会话列表、消息读写）

## 5) 说明

- 本流程不涉及表结构修改
- 不涉及自动迁移
- 不涉及自动备份
- 备份与回退均为人工触发，避免误操作扩散
