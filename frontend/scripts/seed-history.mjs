import path from "path";
import { DatabaseSync } from "node:sqlite";

const dbPath = path.join(process.cwd(), "sqlite.db");
const db = new DatabaseSync(dbPath);

db.exec(
  "CREATE TABLE IF NOT EXISTS conversations (id INTEGER PRIMARY KEY, title TEXT NOT NULL, created_at TEXT NOT NULL)"
);
db.exec("DELETE FROM conversations");

const now = new Date().toISOString();
const insert = db.prepare(
  "INSERT INTO conversations (id, title, created_at) VALUES (?, ?, ?)"
);

insert.run(1, "Q3 季度战略复盘", now);
insert.run(2, "关于裁员的决策咨询", now);
insert.run(3, "供应链成本优化", now);
insert.run(4, "品牌年轻化重塑提案", now);
insert.run(5, "竞争对手动态分析", now);

db.close();
console.log("Seeded conversations into sqlite.db");
