# MySQL 迁移说明（从 SQLite）

这份文档用于把当前 `sqlite.db` 的数据迁移到 MySQL，适合你现在的项目阶段做“先演练、再切换”。

## 1. 先备份 SQLite

```bash
node scripts/backup-sqlite.mjs --source ./sqlite.db --target ./backups/sqlite-$(date +%Y%m%d-%H%M%S).db
```

Windows PowerShell 示例：

```powershell
node scripts/backup-sqlite.mjs --source .\sqlite.db --target .\backups\sqlite-backup.db
```

## 2. 安装 MySQL 驱动

```bash
npm install mysql2
```

## 3. 准备 MySQL 连接信息

你可以二选一：

- 方式 A：直接传 `--mysql-url`
- 方式 B：传 `--host --port --user --password --database`

示例 URL：

```text
mysql://root:your_password@127.0.0.1:3306/ai_coach
```

## 4. 执行迁移

### 方式 A（推荐）

```bash
node scripts/migrate-sqlite-to-mysql.mjs --sqlite ./sqlite.db --mysql-url "mysql://root:password@127.0.0.1:3306/ai_coach" --truncate
```

### 方式 B

```bash
node scripts/migrate-sqlite-to-mysql.mjs --sqlite ./sqlite.db --host 127.0.0.1 --port 3306 --user root --password your_password --database ai_coach --truncate
```

参数说明：

- `--truncate`：导入前先清空目标表（演练阶段建议带上）。
- `--batch-size 500`：每批插入数量，默认 500。
- `--tables users,conversations,messages`：只迁移指定表（逗号分隔）。

## 5. 校验结果

迁移脚本会打印每张表的：

- SQLite 读取行数
- MySQL 导入后行数

建议再手动抽查以下关键表：

- `users`
- `conversations`
- `messages`
- `assessments`
- `winlinez_scores`
- `pikachu_volleyball_scores`

## 6. 上云执行建议

1. 在云端先创建 MySQL（建议阿里云 RDS MySQL）。
2. 将当前线上 `sqlite.db` 做备份。
3. 在同版本代码上运行迁移脚本导入到云端 MySQL。
4. 先灰度验证登录、历史记录、卡片顺序、排行榜。
5. 验证通过后再正式切流。

## 7. 回滚方案

如果切换后发现问题：

1. 先切回 SQLite 配置。
2. 恢复迁移前的 SQLite 备份。
3. 排查后再重新迁移。

---

注意：当前这版是“数据迁移能力”先到位。应用运行时还在使用 SQLite。后续再做“运行时切到 MySQL”的代码改造。
