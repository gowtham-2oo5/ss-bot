import { db } from "./db";

db.run(`CREATE TABLE IF NOT EXISTS warns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  moderator TEXT NOT NULL,
  reason TEXT NOT NULL,
  timestamp INTEGER NOT NULL
)`);

export interface Warn {
  id: string;
  user_id: string;
  moderator: string;
  reason: string;
  timestamp: number;
}

export function addWarn(userId: string, moderator: string, reason: string): Warn {
  const warn: Warn = { id: crypto.randomUUID().slice(0, 8), user_id: userId, moderator, reason, timestamp: Date.now() };
  db.run("INSERT INTO warns (id, user_id, moderator, reason, timestamp) VALUES (?, ?, ?, ?, ?)", [warn.id, warn.user_id, warn.moderator, warn.reason, warn.timestamp]);
  return warn;
}

export function getWarns(userId: string): Warn[] {
  return db.query("SELECT * FROM warns WHERE user_id = ? ORDER BY timestamp DESC").all(userId) as Warn[];
}

export function deleteWarn(userId: string, warnId: string): boolean {
  const result = db.run("DELETE FROM warns WHERE id = ? AND user_id = ?", [warnId, userId]);
  return result.changes > 0;
}

export function deleteAllWarns(userId: string): number {
  const result = db.run("DELETE FROM warns WHERE user_id = ?", [userId]);
  return result.changes;
}
