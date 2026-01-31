import { NextResponse } from "next/server";
import path from "path";
import { DatabaseSync } from "node:sqlite";

const dbPath = path.join(process.cwd(), "sqlite.db");

const getDb = () => {
  const db = new DatabaseSync(dbPath);
  db.exec(
    "CREATE TABLE IF NOT EXISTS conversations (id INTEGER PRIMARY KEY, title TEXT NOT NULL, created_at TEXT NOT NULL)"
  );
  return db;
};

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, title, created_at FROM conversations ORDER BY id ASC"
    )
    .all();
  db.close();
  return NextResponse.json(rows);
}
