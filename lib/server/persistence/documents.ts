/* ============================================================================
   Document persistence — reads the whole model at boot, writes touched
   collections back in one transaction.
   ========================================================================== */

import "server-only";
import type { DatabaseSync } from "node:sqlite";

/** Every `Database` member that is a JSON document collection. */
export const ARRAY_COLLECTIONS = [
  "institutions",
  "departments",
  "academicYears",
  "semesters",
  "sections",
  "teachers",
  "students",
  "courses",
  "schedule",
  "attendanceSessions",
  "attendanceRecords",
  "questions",
  "examinations",
  "attempts",
  "examEvents",
  "devices",
  "grades",
  "notifications",
  "complaints",
  "auditLogs",
  "roles",
  "users",
  "lectureNotes",
] as const;

/** Object members stored as a single key/value document. */
export const KV_KEYS = ["settings", "studentPrefs"] as const;

export const TRACKED_KEYS = [...ARRAY_COLLECTIONS, ...KV_KEYS] as const;
export type TrackedKey = (typeof TRACKED_KEYS)[number];

export interface LoadedState {
  collections: Record<string, unknown[]>;
  kv: Record<string, unknown>;
  /** True when the database file was empty — the caller seeds it. */
  empty: boolean;
}

export function loadState(sqlite: DatabaseSync): LoadedState {
  const collections: Record<string, unknown[]> = {};
  for (const name of ARRAY_COLLECTIONS) collections[name] = [];

  const rows = sqlite
    .prepare("SELECT collection, data FROM documents ORDER BY collection ASC, position ASC")
    .all() as { collection: string; data: string }[];

  for (const row of rows) {
    const bucket = collections[row.collection];
    if (!bucket) continue;
    try {
      bucket.push(JSON.parse(row.data));
    } catch {
      /* a corrupt row must not take down the whole platform */
    }
  }

  const kv: Record<string, unknown> = {};
  const kvRows = sqlite.prepare("SELECT key, value FROM kv").all() as { key: string; value: string }[];
  for (const row of kvRows) {
    try {
      kv[row.key] = JSON.parse(row.value);
    } catch {
      /* ignore */
    }
  }

  const empty = rows.length === 0 && kvRows.length === 0;
  return { collections, kv, empty };
}

/**
 * Writes the given collections. Callers pass the *raw* (unproxied) model so the
 * JSON never has to travel through the tracking proxies.
 */
export function saveCollections(
  sqlite: DatabaseSync,
  dirty: Iterable<TrackedKey>,
  read: (key: TrackedKey) => unknown,
) {
  const keys = [...new Set(dirty)];
  if (keys.length === 0) return;

  const removeCollection = sqlite.prepare("DELETE FROM documents WHERE collection = ?");
  const insertDocument = sqlite.prepare(
    "INSERT INTO documents (collection, id, position, data, updated_at) VALUES (?, ?, ?, ?, ?)",
  );
  const upsertKv = sqlite.prepare(
    "INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
  );

  const now = Date.now();
  sqlite.exec("BEGIN IMMEDIATE");
  try {
    for (const key of keys) {
      const value = read(key);
      if (Array.isArray(value)) {
        removeCollection.run(key);
        value.forEach((record, index) => {
          const id =
            record && typeof record === "object" && "id" in record
              ? String((record as { id: unknown }).id)
              : String(index);
          insertDocument.run(key, id, index, JSON.stringify(record), now);
        });
      } else if (value !== undefined) {
        upsertKv.run(key, JSON.stringify(value), now);
      }
    }
    sqlite.exec("COMMIT");
  } catch (error) {
    try {
      sqlite.exec("ROLLBACK");
    } catch {
      /* already rolled back */
    }
    throw error;
  }
}
