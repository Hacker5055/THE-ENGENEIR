/* ============================================================================
   Server data store — durable SQLite-backed repository
   ----------------------------------------------------------------------------
   The domain code talks to this module exactly as before (`db().students`,
   `db().courses.push(...)`), but every collection is a change-tracked proxy:
   as soon as something mutates, the touched collection is written to SQLite in
   one transaction on the next microtask — before the response leaves the
   process. Restarting the server no longer loses data.

   First run decides the content of the database:
     • AM_DEMO_MODE unset  → production bootstrap (empty + admin from env)
     • AM_DEMO_MODE=1      → deterministic demo dataset (development/training)
   ========================================================================== */

import "server-only";
import { buildSeed, type Database } from "./seed";
import { buildProductionDatabase } from "./bootstrap";
import { sqlite } from "./persistence/database";
import {
  ARRAY_COLLECTIONS,
  KV_KEYS,
  loadState,
  saveCollections,
  type TrackedKey,
} from "./persistence/documents";
import { trackCollection } from "./persistence/tracked";

/** Demo data is a development/training convenience — never the default. */
export function demoMode(): boolean {
  const flag = process.env.AM_DEMO_MODE?.trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  if (flag === "0" || flag === "false" || flag === "no") return false;
  return process.env.NODE_ENV !== "production";
}

interface Runtime {
  __AM_RAW?: Database;
  __AM_VIEW?: Database;
  __AM_DIRTY?: Set<TrackedKey>;
  __AM_FLUSH_SCHEDULED?: boolean;
}

const runtime = globalThis as unknown as Runtime;

function flush() {
  runtime.__AM_FLUSH_SCHEDULED = false;
  const dirty = runtime.__AM_DIRTY;
  const raw = runtime.__AM_RAW;
  if (!dirty || !raw || dirty.size === 0) return;
  const keys = [...dirty];
  dirty.clear();
  try {
    saveCollections(sqlite(), keys, (key) => (raw as unknown as Record<string, unknown>)[key]);
  } catch (error) {
    // A failed write must be loud: the request has already been computed, but
    // silently dropping it would fake durability we do not have.
    console.error("[store] failed to persist", keys.join(","), error);
    for (const key of keys) dirty.add(key);
    throw error;
  }
}

function scheduleFlush() {
  if (runtime.__AM_FLUSH_SCHEDULED) return;
  runtime.__AM_FLUSH_SCHEDULED = true;
  queueMicrotask(() => {
    try {
      flush();
    } catch {
      /* the error is already logged; the microtask must not become unhandled */
    }
  });
}

/** Writes any pending change immediately (used by tests, backup and shutdown). */
export function flushNow() {
  if (runtime.__AM_FLUSH_SCHEDULED) runtime.__AM_FLUSH_SCHEDULED = false;
  flush();
}

function initialise(): Database {
  const state = loadState(sqlite());
  // `next build` prerenders some routes, and a build machine has no admin
  // credentials. The build phase therefore always runs on an in-memory demo
  // dataset: nothing is written anywhere and the production database is never
  // created or required at build time.
  const building = process.env.NEXT_PHASE === "phase-production-build";
  const seed = state.empty ? (building || demoMode() ? buildSeed() : buildProductionDatabase()) : null;

  const raw = (seed ?? {
    bootAt: Date.now(),
    ...Object.fromEntries(ARRAY_COLLECTIONS.map((name) => [name, state.collections[name] ?? []])),
    settings: state.kv.settings,
    studentPrefs: state.kv.studentPrefs ?? {},
  }) as unknown as Database;

  // Hydrated stores must still carry the original boot time.
  if (!seed) raw.bootAt = Number(state.kv.bootAt ?? raw.bootAt);

  const dirty = new Set<TrackedKey>();
  runtime.__AM_DIRTY = dirty;

  const view = { ...raw } as unknown as Record<string, unknown>;
  for (const name of ARRAY_COLLECTIONS) {
    const tracked = trackCollection(raw[name] as unknown as object, () => {
      dirty.add(name);
      scheduleFlush();
    });
    view[name] = tracked.value;
  }
  for (const name of KV_KEYS) {
    const tracked = trackCollection(raw[name] as unknown as object, () => {
      dirty.add(name);
      scheduleFlush();
    });
    view[name] = tracked.value;
  }

  runtime.__AM_RAW = raw;
  runtime.__AM_VIEW = view as unknown as Database;

  if (seed) {
    // Persist the freshly created database before serving the first request.
    dirty.add("bootAt" as TrackedKey);
    for (const name of ARRAY_COLLECTIONS) dirty.add(name);
    for (const name of KV_KEYS) dirty.add(name);
    try {
      saveCollections(sqlite(), [...dirty], (key) => (raw as unknown as Record<string, unknown>)[key]);
      dirty.clear();
    } catch (error) {
      console.error("[store] bootstrap write failed", error);
      throw error;
    }
    sqlite()
      .prepare(
        "INSERT INTO kv (key, value, updated_at) VALUES ('bootAt', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      )
      .run(String(raw.bootAt), Date.now());
  }

  return runtime.__AM_VIEW;
}

export function db(): Database {
  return runtime.__AM_VIEW ?? initialise();
}

/* ------------------------------ lookups ------------------------------ */
export const findStudent = (id: string) => db().students.find((s) => s.id === id);
export const findTeacher = (id: string) => db().teachers.find((t) => t.id === id);
export const findCourse = (id: string) => db().courses.find((c) => c.id === id);
export const findDepartment = (id: string) => db().departments.find((d) => d.id === id);
export const findSection = (id: string) => db().sections.find((s) => s.id === id);
export const findExam = (id: string) => db().examinations.find((e) => e.id === id);
export const findAttempt = (id: string) => db().attempts.find((a) => a.id === id);
export const findAttemptFor = (examId: string, studentId: string) =>
  db().attempts.find((a) => a.examinationId === examId && a.studentId === studentId);
export const findQuestion = (id: string) => db().questions.find((q) => q.id === id);

export const coursesForStudent = (studentId: string) => {
  const s = findStudent(studentId);
  if (!s) return [];
  return db().courses.filter((c) => s.enrolledCourseIds.includes(c.id));
};

export const coursesForTeacher = (teacherId: string) => {
  const t = findTeacher(teacherId);
  if (!t) return [];
  return db().courses.filter((c) => t.courseIds.includes(c.id));
};

export function studentAttendance(studentId: string, courseId?: string) {
  const recs = db().attendanceRecords.filter(
    (r) => r.studentId === studentId && (!courseId || r.courseId === courseId),
  );
  const count = (s: string) => recs.filter((r) => r.status === s).length;
  const present = count("PRESENT");
  const late = count("LATE");
  const absent = count("ABSENT");
  const excused = count("EXCUSED");
  const total = recs.length || 1;
  return {
    present,
    late,
    absent,
    excused,
    total: recs.length,
    rate: Math.round(((present + late) / total) * 1000) / 10,
    records: recs.sort((a, b) => (a.date < b.date ? 1 : -1)),
  };
}

export function semesterGrade(studentId: string, semesterId: string) {
  return db().grades.filter((g) => g.studentId === studentId && g.semesterId === semesterId);
}

export function gpaFor(studentId: string) {
  const graded = db().grades.filter((g) => g.studentId === studentId && g.published);
  if (!graded.length) return 0;
  const credits = graded.reduce((a, g) => a + (findCourse(g.courseId)?.credits ?? 3), 0);
  const points = graded.reduce((a, g) => a + g.points * (findCourse(g.courseId)?.credits ?? 3), 0);
  return credits ? Math.round((points / credits) * 100) / 100 : 0;
}

/* ------------------------------ mutations ---------------------------- */
export function pushAudit(entry: {
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  actionAr: string;
  target: string;
  reason?: string;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  ip?: string;
}) {
  const logs = db().auditLogs;
  logs.unshift({
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
    actorId: entry.actorId,
    actorName: entry.actorName,
    actorRole: entry.actorRole,
    action: entry.action,
    actionAr: entry.actionAr,
    target: entry.target,
    reason: entry.reason,
    ip: entry.ip ?? "197.44.12.88",
    severity: entry.severity ?? "INFO",
  });
}

export function notify(entry: {
  userId: string;
  role: import("@/lib/types").Role;
  category: import("@/lib/types").NotificationCategory;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  href?: string;
  priority?: "NORMAL" | "HIGH";
}) {
  db().notifications.unshift({
    id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: entry.userId,
    audienceRole: entry.role,
    category: entry.category,
    titleAr: entry.titleAr,
    titleEn: entry.titleEn,
    bodyAr: entry.bodyAr,
    bodyEn: entry.bodyEn,
    createdAt: Date.now(),
    read: false,
    href: entry.href,
    priority: entry.priority ?? "NORMAL",
  });
}
