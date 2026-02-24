import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'jobs.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      description      TEXT DEFAULT '',
      schedule         TEXT NOT NULL,
      command          TEXT NOT NULL,
      workflow_yaml    TEXT NOT NULL,
      runs_on          TEXT NOT NULL DEFAULT 'ubuntu-latest',
      job_type         TEXT NOT NULL DEFAULT 'shell',
      enabled          INTEGER NOT NULL DEFAULT 1,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL,
      last_triggered   TEXT,
      workflow_file    TEXT
    );

    CREATE TABLE IF NOT EXISTS run_history (
      id         TEXT PRIMARY KEY,
      job_id     TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      triggered  TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'triggered',
      run_id     TEXT,
      run_url    TEXT
    );
  `);

  // Migration: add job_type column to existing DBs
  try {
    db.exec(`ALTER TABLE jobs ADD COLUMN job_type TEXT NOT NULL DEFAULT 'shell'`);
  } catch { /* column already exists */ }
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .run(key, value);
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export interface Job {
  id: string;
  name: string;
  description: string;
  schedule: string;
  command: string;
  workflow_yaml: string;
  runs_on: string;
  job_type: string;
  enabled: number;
  created_at: string;
  updated_at: string;
  last_triggered: string | null;
  workflow_file: string | null;
}

export function listJobs(): Job[] {
  return getDb().prepare('SELECT * FROM jobs ORDER BY created_at DESC').all() as Job[];
}

export function getJob(id: string): Job | null {
  return (getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Job) ?? null;
}

export function createJob(job: Omit<Job, 'created_at' | 'updated_at'>): Job {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO jobs (id, name, description, schedule, command, workflow_yaml, runs_on, job_type, enabled, created_at, updated_at, last_triggered, workflow_file)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      job.id,
      job.name,
      job.description,
      job.schedule,
      job.command,
      job.workflow_yaml,
      job.runs_on,
      job.job_type ?? 'shell',
      job.enabled,
      now,
      now,
      job.last_triggered,
      job.workflow_file
    );
  return getJob(job.id)!;
}

export function updateJob(id: string, patch: Partial<Omit<Job, 'id' | 'created_at'>>): Job | null {
  const job = getJob(id);
  if (!job) return null;
  const updated = { ...job, ...patch, updated_at: new Date().toISOString() };
  getDb()
    .prepare(
      `UPDATE jobs SET name=?, description=?, schedule=?, command=?, workflow_yaml=?, runs_on=?, job_type=?, enabled=?, updated_at=?, last_triggered=?, workflow_file=?
       WHERE id=?`
    )
    .run(
      updated.name,
      updated.description,
      updated.schedule,
      updated.command,
      updated.workflow_yaml,
      updated.runs_on,
      updated.job_type ?? 'shell',
      updated.enabled,
      updated.updated_at,
      updated.last_triggered,
      updated.workflow_file,
      id
    );
  return getJob(id);
}

export function deleteJob(id: string): boolean {
  const result = getDb().prepare('DELETE FROM jobs WHERE id = ?').run(id);
  return result.changes > 0;
}

// ─── Run History ──────────────────────────────────────────────────────────────

export interface RunRecord {
  id: string;
  job_id: string;
  triggered: string;
  status: string;
  run_id: string | null;
  run_url: string | null;
}

export function addRunRecord(record: RunRecord): void {
  getDb()
    .prepare(
      'INSERT INTO run_history (id, job_id, triggered, status, run_id, run_url) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(record.id, record.job_id, record.triggered, record.status, record.run_id, record.run_url);
}

export function getRunHistory(jobId: string, limit = 20): RunRecord[] {
  return getDb()
    .prepare('SELECT * FROM run_history WHERE job_id = ? ORDER BY triggered DESC LIMIT ?')
    .all(jobId, limit) as RunRecord[];
}
