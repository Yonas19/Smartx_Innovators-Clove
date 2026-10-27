import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "salvage.db");

// In production/edge we can't use better-sqlite3, but this app is Node-only (server actions/route handlers)
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

export type DbClient = ReturnType<typeof drizzle<typeof schema>>;

// For scripts that need the raw better-sqlite3 instance
export function getRawDb() {
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

export { schema };
