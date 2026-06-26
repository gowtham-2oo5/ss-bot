import { Database } from "bun:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = join(import.meta.dir, "..", "..", "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(join(DATA_DIR, "ss-bot.db"));
db.run("PRAGMA journal_mode = WAL");

db.run(`CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
)`);

export function getConfig(key: string): string | null {
  const row = db.query("SELECT value FROM config WHERE key = ?").get(key) as any;
  return row?.value ?? null;
}

export function setConfig(key: string, value: string): void {
  db.run("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", [key, value]);
}
