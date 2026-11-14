import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { db, findCourse, findDepartment, studentAttendance } from "@/lib/server/store";
import { can } from "@/lib/permissions";
import { pushAudit } from "@/lib/server/store";

/**
 * GET /api/v1/reports/:kind
 * CSV export. Authorised by the report.export permission and audited on every
 * call so an export can never happen silently.
 */
const HEADERS: Record<string, string[]> = {
  students: ["student_number", "name_ar", "name_en", "department", "level", "gpa", "attendance_rate", "standing"],
  grades: ["student_number", "course_code", "coursework", "midterm", "final", "total", "letter", "points", "published"],
  attendance: ["student_number", "course_code", "date", "status", "method", "distance_m", "marked_at"],
  exams: ["code", "title_ar", "course_code", "status", "policy", "total_marks", "attempts", "flagged", "locked"],
  audit: ["at", "action", "actor_name", "actor_role", "target", "reason", "severity"],
};

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user.role, "report.export")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { kind } = await params;
  const headers = HEADERS[kind];
  if (!headers) return NextResponse.json({ error: "UNKNOWN_REPORT" }, { status: 404 });

  let rows: (string | number)[][] = [];

  if (kind === "students") {
    rows = db().students.map((s) => {
      const dept = findDepartment(s.departmentId);
      return [s.studentNumber, s.nameAr, s.nameEn, dept ? dept.nameEn : "", s.level, s.gpa.toFixed(2), studentAttendance(s.id).rate, s.academicStatus];
    });
  } else if (kind === "grades") {
    rows = db().grades.map((g) => {
      const st = db().students.find((s) => s.id === g.studentId);
      const course = findCourse(g.courseId);
      return [st?.studentNumber ?? g.studentId, course?.code ?? g.courseId, g.coursework, g.midterm, g.final, g.total, g.letter, g.points, g.published ? "yes" : "no"];
    });
  } else if (kind === "attendance") {
    rows = db().attendanceRecords.map((r) => {
      const st = db().students.find((s) => s.id === r.studentId);
      const course = findCourse(r.courseId);
      return [st?.studentNumber ?? r.studentId, course?.code ?? r.courseId, r.date, r.status, r.method, r.geoDistanceM ? Math.round(r.geoDistanceM) : "", new Date(r.markedAt).toISOString()];
    });
  } else if (kind === "exams") {
    rows = db().examinations.map((e) => {
      const course = findCourse(e.courseId);
      const attempts = db().attempts.filter((a) => a.examinationId === e.id);
      return [e.code, e.titleAr, course?.code ?? e.courseId, e.status, e.policy, e.totalMarks, attempts.length, attempts.filter((a) => a.status === "FLAGGED").length, attempts.filter((a) => a.status === "LOCKED").length];
    });
  } else if (kind === "audit") {
    rows = db().auditLogs.map((a) => [new Date(a.at).toISOString(), a.action, a.actorName, a.actorRole, a.target, a.reason ?? "", a.severity]);
  }

  pushAudit({
    actorId: user.id,
    actorName: user.nameAr,
    actorRole: user.role,
    action: "report.export",
    actionAr: "تصدير تقرير CSV",
    target: `${kind} · ${rows.length} rows`,
    ip: "197.44.12.9",
    severity: "INFO",
  });

  const csv = [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  return new NextResponse(`\u{FEFF}${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="al-mohandes-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
