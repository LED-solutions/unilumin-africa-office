/* Base de données locale (fichier data/app.db) – SQLite intégré à Node.js, rien à installer. */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export const DATA_DIR = process.env.UAO_DATA || path.resolve(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
export const DB_PATH = path.join(DATA_DIR, 'app.db');

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  pass_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  must_change INTEGER NOT NULL DEFAULT 0,
  lang TEXT NOT NULL DEFAULT 'fr',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS dossiers (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,
  n INTEGER NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  deleted_at TEXT,
  deleted_by TEXT
);
CREATE INDEX IF NOT EXISTS dossiers_updated ON dossiers(updated_at);
CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY,
  dossier_id INTEGER NOT NULL,
  at TEXT NOT NULL,
  who TEXT,
  field TEXT NOT NULL,
  before TEXT,
  after TEXT
);
CREATE INDEX IF NOT EXISTS history_dossier ON history(dossier_id);
CREATE TABLE IF NOT EXISTS stock (
  id INTEGER PRIMARY KEY,
  art TEXT NOT NULL,
  cat TEXT, info TEXT, w REAL, h REAL,
  tot REAL NOT NULL DEFAULT 0,
  sav REAL NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'Cabinet',
  lim TEXT, rem TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS team (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT '',
  role TEXT DEFAULT '',
  email TEXT DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sugg (
  list TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (list, value)
);
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
`);

export function nowIso() { return new Date().toISOString(); }
export function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}
export function meta(k, v) {
  if (v === undefined) { const r = db.prepare('SELECT v FROM meta WHERE k = ?').get(k); return r ? r.v : null; }
  db.prepare('INSERT INTO meta(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').run(k, String(v));
}

/* Sauvegarde quotidienne : data/backups/app-AAAA-MM-JJ.db (30 dernières gardées) */
export function backup() {
  const dir = path.join(DATA_DIR, 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  const file = path.join(dir, `app-${day}.db`);
  if (fs.existsSync(file)) return null;
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  const all = fs.readdirSync(dir).filter(f => /^app-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort();
  for (const f of all.slice(0, Math.max(0, all.length - 30))) fs.unlinkSync(path.join(dir, f));
  return file;
}
