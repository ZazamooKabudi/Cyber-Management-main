// node:sqlite is built into Node.js 22.5+ — no native compilation needed.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const { getConfig } = require('./config');

const DB_PATH = getConfig().db_path;
let db;

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

function initDb() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  // Migrations tracking table
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL
  )`);

  runMigrations();

  const { seedDatabase } = require('./seed');
  seedDatabase(db);

  console.log(`[DB] SQLite database ready: ${DB_PATH}`);
}

function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const already = db.prepare('SELECT id FROM _migrations WHERE name = ?').get(file);
    if (already) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(file, new Date().toISOString());
    console.log(`[DB] Migration applied: ${file}`);
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────

function parseJsonField(value) {
  if (!value) return [];
  try { return JSON.parse(value); } catch { return []; }
}

function serializeJsonField(value) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return JSON.stringify(value);
}

module.exports = { getDb, initDb, parseJsonField, serializeJsonField };
