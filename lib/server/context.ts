import "server-only";
import { requireRole, requireUser } from "@/lib/server/auth";
import { cookies } from "next/headers";
import { db, findDepartment, findSection, findStudent, findTeacher, coursesForStudent, coursesForTeacher } from "@/lib/server/store";
import type { SessionUser, Student, Teacher } from "@/lib/types";
import type { Locale } from "@/lib/types";
import { getPrefs } from "@/lib/prefs";

export async function shellPrefs() {
  return getPrefs();
}

export interface StudentContext {
  user: SessionUser;
  student: Student;
  department: { nameAr: string; nameEn: string; code: string; color: string };
  sectionName: string;
  courses: ReturnType<typeof coursesForStudent>;
  unread: number;
  locale: Locale;
}

export async function studentContext(): Promise<StudentContext> {
  const user = await requireRole(["STUDENT"]);
  const student = findStudent(user.studentId ?? "");
  if (!student) throw new Error("Student profile missing");
  const dept = findDepartment(student.departmentId)!;
  const section = findSection(student.sectionId);
  const { locale } = await getPrefs();
  return {
    user,
    student,
    department: { nameAr: dept.nameAr, nameEn: dept.nameEn, code: dept.code, color: dept.color },
    sectionName: section ? (locale === "ar" ? section.nameAr : section.nameEn) : "",
    courses: coursesForStudent(student.id),
    unread: db().notifications.filter((n) => n.userId === user.id && !n.read).length,
    locale,
  };
}

export interface TeacherContext {
  user: SessionUser;
  teacher: Teacher;
  courses: ReturnType<typeof coursesForTeacher>;
  unread: number;
  locale: Locale;
}

export async function teacherContext(): Promise<TeacherContext> {
  const user = await requireRole(["TEACHER"]);
  const teacher = findTeacher(user.teacherId ?? "");
  if (!teacher) throw new Error("Teacher profile missing");
  const { locale } = await getPrefs();
  return {
    user,
    teacher,
    courses: coursesForTeacher(teacher.id),
    unread: db().notifications.filter((n) => n.userId === user.id && !n.read).length,
    locale,
  };
}

export async function adminContext() {
  const user = await requireUser();
  if (!["INSTITUTION_ADMIN", "SUPER_ADMIN", "EXAM_SUPERVISOR"].includes(user.role)) {
    await requireRole(["INSTITUTION_ADMIN"]);
  }
  const { locale, theme } = await getPrefs();
  const unread = db().notifications.filter((n) => n.userId === user.id && !n.read).length;
  const openComplaints = db().complaints.filter((c) => c.status === "OPEN").length;
  const lockedAttempts = db().attempts.filter((a) => a.status === "LOCKED" || a.status === "FLAGGED").length;
  return { user, locale, theme, unread, openComplaints, lockedAttempts };
}

/** Small utility so routes can safely resolve "now" server-side. */
export async function serverNow() {
  // Touching cookies keeps the route dynamic (no static caching of live data).
  await cookies();
  return Date.now();
}
