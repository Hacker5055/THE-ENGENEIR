import Link from "next/link";
import { Badge, Icon, Progress } from "@/components/ui";
import { MobileAppBar } from "@/components/shells/mobile-shell";
import { findTeacher, db, studentAttendance } from "@/lib/server/store";
import { studentContext } from "@/lib/server/context";
import { makeL, weekdayShort } from "@/lib/utils";

export const metadata = { title: "المقررات" };

export default async function CoursesPage() {
  const { student, courses, locale, unread } = await studentContext();
  const l = makeL(locale);

  return (
    <div className="pb-5">
      <MobileAppBar
        back={{ href: "/student" }}
        title={l("المقررات", "Courses")}
        subtitle={`${courses.length} ${l("مقررات ·", "courses ·")} ${courses.reduce((a, c) => a + c.credits, 0)} ${l("ساعة معتمدة", "credit hours")}`}
        unread={unread}
      />
      <div className="space-y-2.5 px-4 pt-4">
        {courses.map((course) => {
          const teacher = findTeacher(course.teacherId)!;
          const att = studentAttendance(student.id, course.id);
          const slots = db().schedule.filter((s) => s.courseId === course.id);
          const grade = db().grades.find((g) => g.studentId === student.id && g.courseId === course.id && !g.published);
          return (
            <Link key={course.id} href={`/student/courses/${course.id}`} className="block rounded-xl border border-line bg-surface p-3.5 transition hover:border-line-strong hover:bg-surface-2">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg text-[10px] font-bold" style={{ background: `${course.color}1f`, color: course.color }}>
                  {course.code.replace(/\d+/g, "")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-[12.5px] font-semibold text-fg">{l(course.nameAr, course.nameEn)}</p>
                    <Icon name="chevron-left" size={14} className="mt-0.5 shrink-0 text-fg-muted ltr:rotate-180" />
                  </div>
                  <p className="mt-0.5 font-mono text-[9.5px] text-fg-muted">{course.code} · {course.credits} {l("ساعات", "credits")}</p>
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-fg-muted">
                    <Icon name="user" size={10} /> {teacher.nameAr}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-2.5">
                <div>
                  <p className="text-[9px] text-fg-muted">{l("الحضور", "Attendance")}</p>
                  <p className={`tnum text-[12px] font-semibold ${att.rate >= 85 ? "text-success-500" : att.rate >= 75 ? "text-warn-500" : "text-danger-500"}`}>{att.rate}%</p>
                </div>
                <div>
                  <p className="text-[9px] text-fg-muted">{l("أعمال السنة", "Coursework")}</p>
                  <p className="tnum text-[12px] font-semibold text-fg">{grade ? `${grade.coursework + grade.midterm}/40` : "—"}</p>
                </div>
                <div>
                  <p className="text-[9px] text-fg-muted">{l("التقدم", "Progress")}</p>
                  <p className="tnum text-[12px] font-semibold text-fg">{course.progress}%</p>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {slots.map((s) => (
                  <span key={s.id} className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[9px] text-fg-muted">
                    {weekdayShort(s.day, locale)} {s.start}
                  </span>
                ))}
                <span className="ms-auto">
                  <Progress value={course.progress} size="sm" className="w-16" />
                </span>
              </div>
            </Link>
          );
        })}

        <div className="rounded-xl border border-dashed border-line bg-surface/40 p-3.5 text-center">
          <p className="text-[11px] font-medium text-fg-soft">{l("التسجيل في مقرر إضافي", "Add a course")}</p>
          <p className="mt-1 text-[10px] text-fg-muted">
            {l("التسجيل متاح خلال فترة الحذف والإضافة فقط، ويتم عبر الإدارة.", "Registration opens only during the add/drop window and is handled by administration.")}
          </p>
          <Link href="/student/complaints/new" className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-medium text-accent-400">
            {l("تقديم طلب", "Submit a request")} <Icon name="arrow-left" size={11} className="ltr:rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}
