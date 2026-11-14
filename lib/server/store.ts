/* ============================================================================
   Server data store
   ----------------------------------------------------------------------------
   The prototype runs against an in-process store. It is deliberately shaped
   like a repository layer so that each accessor can be swapped for a
   PostgreSQL query (see /db/schema.sql + /docs/07-backend-architecture.md).
   Persistence is process-lifetime only — the UI never pretends otherwise.
   ========================================================================== */

import { buildSeed, type Database } from "./seed";

const globalStore = globalThis as unknown as { __AM_DB?: Database };

export function db(): Database {
  if (!globalStore.__AM_DB) globalStore.__AM_DB = buildSeed();
  return globalStore.__AM_DB;
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
