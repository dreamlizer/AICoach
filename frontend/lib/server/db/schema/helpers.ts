import type { DatabaseInstance } from "../core";

export const getTableColumns = (db: DatabaseInstance, tableName: string) =>
  db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;

export const hasColumn = (db: DatabaseInstance, tableName: string, columnName: string) =>
  getTableColumns(db, tableName).some((column) => column.name === columnName);
