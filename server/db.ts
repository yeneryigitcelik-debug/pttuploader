import { drizzle } from "drizzle-orm/sql-js";
import initSqlJs from "sql.js";
import * as schema from "@shared/schema";
import path from "path";
import fs from "fs";

function getDbPath(): string {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, "pttavm-bot.db");
}

const dbPath = getDbPath();

// sql.js requires async initialization (top-level await works with "type": "module")
const SQL = await initSqlJs();

let sqlite: InstanceType<typeof SQL.Database>;
if (fs.existsSync(dbPath)) {
  const buffer = fs.readFileSync(dbPath);
  sqlite = new SQL.Database(buffer);
} else {
  sqlite = new SQL.Database();
}

// Enable WAL mode and foreign keys
sqlite.run("PRAGMA journal_mode = WAL");
sqlite.run("PRAGMA foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Auto-create tables
sqlite.run(`
  CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT NOT NULL UNIQUE,
    from_addr TEXT NOT NULL,
    subject TEXT,
    received_at TEXT NOT NULL,
    processed_at TEXT,
    raw_order_id TEXT,
    status TEXT NOT NULL DEFAULT 'NEW'
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_id INTEGER NOT NULL REFERENCES emails(id),
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    attachment_id INTEGER NOT NULL REFERENCES attachments(id),
    status TEXT NOT NULL DEFAULT 'QUEUED',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    insured_name_raw TEXT,
    insured_name_norm TEXT,
    amount_cents INTEGER,
    match_decision TEXT,
    match_reason TEXT,
    candidates_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    ptt_order_id TEXT NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
    result TEXT NOT NULL,
    evidence_path TEXT
  );

  CREATE TABLE IF NOT EXISTS mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extracted_order_id TEXT NOT NULL UNIQUE,
    normalized_order_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/** Save the in-memory database to disk */
export function saveDb(): void {
  const data = sqlite.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// Auto-save on process exit
function gracefulSave() {
  try { saveDb(); } catch { /* ignore errors during shutdown */ }
}
process.on("exit", gracefulSave);
process.on("SIGINT", () => { gracefulSave(); process.exit(); });
process.on("SIGTERM", () => { gracefulSave(); process.exit(); });

console.log(`Database initialized at: ${dbPath}`);
