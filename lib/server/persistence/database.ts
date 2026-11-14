/* ============================================================================
   SQLite engine — durable storage for the platform
   ----------------------------------------------------------------------------
   Uses `node:sqlite` (built into Node 22+) so the deployment has **no native
   module to compile** and no platform-specific binary in the lockfile. One file
   on disk, WAL journal, full synchronous write.

   Layout
     documents(collection, id, position, data)  → every domain collection as
                                                  JSON documents, one row each
     kv(key, value)                             → settings / student prefs / meta
     sessions, auth_challenges, password_resets,
     login_attempts                             → first-class tables (indexed,
                                                  queried directly, never cached)

   The `documents` table is a document store on purpose: the domain model is
   already expressed as typed records in `lib/types.ts`, and keeping them as
   documents means the UI and business rules stay untouched while every change
   becomes durable.
   ========================================================================== */

import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS documents (
  collection  TEXT    NOT NULL,
  id          TEXT    NOT NULL,
  position    INTEGER NOT NULL,
  data        TEXT    NOT NULL,
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (collection, id)
);
CREATE INDEX IF NOT EXISTS documents_collection_position
  ON documents(collection, position);

CREATE TABLE IF NOT EXISTS kv (
  key        TEXT PRIMARY KEY,
  value      TEXT    NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT    NOT NULL,
  role       TEXT    NOT NULL,
  issued_at  INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ip         TEXT    NOT NULL DEFAULT '',
  agent      TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS auth_challenges (
  id         TEXT PRIMARY KEY,
  user_id    TEXT    NOT NULL,
  code_hash  TEXT    NOT NULL,
  issued_at  INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  demo_code  TEXT
);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT    NOT NULL,
  issued_at  INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at    INTEGER
);

CREATE TABLE IF NOT EXISTS login_attempts (
  key        TEXT PRIMARY KEY,
  failures   INTEGER NOT NULL DEFAULT 0,
  first_at   INTEGER NOT NULL,
  last_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

/** Forward-only migrations for databases created by an older build. */
function migrate(sqlite: DatabaseSync) {
  const columns = sqlite.prepare("PRAGMA table_info(auth_challenges)").all() as { name: string }[];
  if (!columns.some((c) => c.name === "demo_code")) {
    sqlite.exec("ALTER TABLE auth_challenges ADD COLUMN demo_code TEXT");
  }
}

export function databasePath(): string {
  const configured = process.env.AM_DB_PATH?.trim();
  if (!configured) return resolve(process.cwd(), ".data", "almohandes.db");
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

export function openDatabase(path = ":memory:"): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const sqlite = new DatabaseSync(path);
  // WAL keeps readers from blocking the single writer; FULL sync means a
  // committed write survives a power cut, which matters for exam submissions.
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA synchronous = FULL;");
  sqlite.exec("PRAGMA busy_timeout = 5000;");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  sqlite.exec(SCHEMA);
  migrate(sqlite);
  return sqlite;
}

/** Single connection per process; Next.js keeps one module registry on globalThis. */
const runtime = globalThis as unknown as { __AM_SQLITE?: DatabaseSync };

export function sqlite(): DatabaseSync {
  if (!runtime.__AM_SQLITE) {
    // `next build` evaluates server modules while prerendering. It must never
    // create or touch the live database file, so the build phase gets a
    // throw-away in-memory engine.
    const building = process.env.NEXT_PHASE === "phase-production-build";
    runtime.__AM_SQLITE = openDatabase(building ? ":memory:" : databasePath());
  }
  return runtime.__AM_SQLITE;
}

/** Runs `fn` inside one immediate transaction. */
export function transaction<T>(fn: () => T): T {
  const db = sqlite();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* already rolled back */
    }
    throw error;
  }
}

export function meta(key: string): string | null {
  const row = sqlite().prepare("SELECT value FROM schema_meta WHERE key = ?").get(key) as
    | { value?: string }
    | undefined;
  return row?.value ?? null;
}

export function setMeta(key: string, value: string) {
  sqlite()
    .prepare(
      "INSERT INTO schema_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(key, value);
}

/** SQLite has no boolean type; helpers keep the boundary honest. */
export const nowMs = () => Date.now();
