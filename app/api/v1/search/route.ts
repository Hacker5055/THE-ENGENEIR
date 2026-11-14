import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { db } from "@/lib/server/store";

/**
 * Global search for the ⌘K palette.
 *
 * Results are scoped by role on the server — a student can only ever see their
 * own courses/exams, a teacher only the courses they teach, and staff the
 * institution-wide records their permissions cover. The palette itself never
 * decides what is visible.
 */

type Hit = {
  kind: "student" | "teacher" | "course" | "exam" | "complaint" | "institution" | "question";
  title: string;
  subtitle: string;
  href: string;
};

const LIMIT = 6;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const hit = (haystack: (string | undefined)[], q: string) =>
  haystack.some((h) => h && norm(h).includes(q));

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const q = norm(new URL(req.url).searchParams.get("q") ?? "");
  if (q.length < 2) return NextResponse.json({ groups: [], query: q });

  const data = db();
  const groups: { key: string; items: Hit[] }[] = [];
  const staff = user.role !== "STUDENT" && user.role !== "TEACHER";

  if (user.role === "STUDENT") {
    const me = data.students.find((s) => s.id === user.id);
    const myCourses = data.courses.filter((c) => me?.enrolledCourseIds.includes(c.id));

    const courses = myCourses
      .filter((c) => hit([c.code, c.nameAr, c.nameEn], q))
      .slice(0, LIMIT)
      .map<Hit>((c) => ({ kind: "course", title: `${c.code} — ${c.nameAr}`, subtitle: c.nameEn, href: `/student/courses/${c.id}` }));

    const exams = data.examinations
      .filter((e) => myCourses.some((c) => c.id === e.courseId) && hit([e.titleAr, e.titleEn, e.code], q))
      .slice(0, LIMIT)
      .map<Hit>((e) => ({ kind: "exam", title: e.titleAr, subtitle: e.titleEn, href: `/student/exams/${e.id}` }));

    if (courses.length) groups.push({ key: "courses", items: courses });
    if (exams.length) groups.push({ key: "exams", items: exams });
  }

  if (user.role === "TEACHER") {
    const teacher = data.teachers.find((t) => t.id === user.id);
    const myCourses = data.courses.filter((c) => teacher?.courseIds.includes(c.id));
    const myCourseIds = new Set(myCourses.map((c) => c.id));

    const courses = myCourses
      .filter((c) => hit([c.code, c.nameAr, c.nameEn], q))
      .slice(0, LIMIT)
      .map<Hit>((c) => ({ kind: "course", title: `${c.code} — ${c.nameAr}`, subtitle: c.nameEn, href: `/teacher/classes` }));

    const students = data.students
      .filter((s) => s.enrolledCourseIds.some((id) => myCourseIds.has(id)) && hit([s.nameAr, s.nameEn, s.studentNumber], q))
      .slice(0, LIMIT)
      .map<Hit>((s) => ({ kind: "student", title: s.nameAr, subtitle: `${s.studentNumber} · ${s.nameEn}`, href: `/admin/students/${s.id}` }));

    const exams = data.examinations
      .filter((e) => myCourseIds.has(e.courseId) && hit([e.titleAr, e.titleEn, e.code], q))
      .slice(0, LIMIT)
      .map<Hit>((e) => ({ kind: "exam", title: e.titleAr, subtitle: e.titleEn, href: `/teacher/exams/${e.id}` }));

    const questions = data.questions
      .filter((qq) => myCourseIds.has(qq.courseId) && hit([qq.promptAr, qq.promptEn, qq.id], q))
      .slice(0, LIMIT)
      .map<Hit>((qq) => ({ kind: "question", title: qq.promptAr.slice(0, 90), subtitle: qq.promptEn.slice(0, 90), href: `/teacher/questions` }));

    if (courses.length) groups.push({ key: "courses", items: courses });
    if (students.length) groups.push({ key: "students", items: students });
    if (exams.length) groups.push({ key: "exams", items: exams });
    if (questions.length) groups.push({ key: "questions", items: questions });
  }

  if (staff) {
    const students = data.students
      .filter((s) => hit([s.nameAr, s.nameEn, s.studentNumber, s.email], q))
      .slice(0, LIMIT)
      .map<Hit>((s) => ({ kind: "student", title: s.nameAr, subtitle: `${s.studentNumber} · ${s.nameEn}`, href: `/admin/students/${s.id}` }));

    const teachers = data.teachers
      .filter((t) => hit([t.nameAr, t.nameEn, t.email], q))
      .slice(0, LIMIT)
      .map<Hit>((t) => ({ kind: "teacher", title: t.nameAr, subtitle: `${t.title} · ${t.email}`, href: `/admin/teachers` }));

    const courses = data.courses
      .filter((c) => hit([c.code, c.nameAr, c.nameEn], q))
      .slice(0, LIMIT)
      .map<Hit>((c) => ({ kind: "course", title: `${c.code} — ${c.nameAr}`, subtitle: c.nameEn, href: `/admin/courses` }));

    const exams = data.examinations
      .filter((e) => hit([e.titleAr, e.titleEn, e.code], q))
      .slice(0, LIMIT)
      .map<Hit>((e) => ({ kind: "exam", title: e.titleAr, subtitle: `${e.code} · ${e.status}`, href: `/admin/exams` }));

    const complaints = data.complaints
      .filter((c) => hit([c.subject, c.ticket, c.body], q))
      .slice(0, LIMIT)
      .map<Hit>((c) => ({ kind: "complaint", title: c.subject, subtitle: `${c.ticket} · ${c.status}`, href: `/admin/complaints/${c.id}` }));

    const institutions = data.institutions
      .filter((i) => hit([i.nameAr, i.nameEn, i.code, i.city], q))
      .slice(0, LIMIT)
      .map<Hit>((i) => ({ kind: "institution", title: i.nameAr, subtitle: `${i.code} · ${i.city}`, href: `/admin/institutions` }));

    if (students.length) groups.push({ key: "students", items: students });
    if (teachers.length) groups.push({ key: "teachers", items: teachers });
    if (courses.length) groups.push({ key: "courses", items: courses });
    if (exams.length) groups.push({ key: "exams", items: exams });
    if (complaints.length) groups.push({ key: "complaints", items: complaints });
    if (institutions.length) groups.push({ key: "institutions", items: institutions });
  }

  return NextResponse.json({ query: q, total: groups.reduce((n, g) => n + g.items.length, 0), groups });
}
