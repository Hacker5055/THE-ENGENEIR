import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Icon, Progress } from "@/components/ui";
import { MobileAppBar } from "@/components/shells/mobile-shell";
import { db, findCourse, findTeacher, studentAttendance } from "@/lib/server/store";
import { studentContext } from "@/lib/server/context";
import { fmtDate, makeL, weekdayName } from "@/lib/utils";

export const metadata = { title: "تفاصيل المقرر" };

const NOTE_ICON = { SLIDES: "layers", VIDEO: "play", PDF: "file-text", ASSIGNMENT: "edit" } as const;

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { student, courses, locale, unread } = await studentContext();
  const l = makeL(locale);
  const { id } = await params;
  const course = findCourse(id);
  if (!course || !student.enrolledCourseIds.includes(course.id)) notFound();

  const teacher = findTeacher(course.teacherId)!;
  const slots = db().schedule.filter((s) => s.courseId === course.id).sort((a, b) => a.day - b.day);
  const notes = db().lectureNotes.filter((n) => n.courseId === course.id);
  const att = studentAttendance(student.id, course.id);
  const grade = db().grades.find((g) => g.studentId === student.id && g.courseId === course.id && !g.published);
  const exams = db().examinations.filter((e) => e.courseId === course.id);
  const assessment = [
    { ar: "أعمال السنة", en: "Coursework", weight: 20, score: grade?.coursework },
    { ar: "الاختبار النصفي", en: "Midterm", weight: 20, score: grade?.midterm },
    { ar: "الاختبار النهائي", en: "Final", weight: 60, score: grade?.final },
  ];

  return (
    <div className="pb-6">
      <MobileAppBar back={{ href: "/student/courses" }} title={l(course.nameAr, course.nameEn)} subtitle={`${course.code} · ${l("المستوى", "Level")} ${course.level}`} unread={unread} />

      <div className="space-y-4 px-4 pt-4">
        <section className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4">
          <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${course.color}, transparent)` }} aria-hidden="true" />
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl font-mono text-[11px] font-bold" style={{ background: `${course.color}1c`, color: course.color }}>
              {course.code.replace(/\d+/g, "")}
            </span>
            <div className="min-w-0">
              <h1 className="text-[13.5px] font-semibold text-fg">{l(course.nameAr, course.nameEn)}</h1>
              <p className="mt-0.5 font-mono text-[9.5px] text-fg-muted">{course.code} · {course.credits} {l("ساعات معتمدة", "credit hours")}</p>
            </div>
          </div>
          <p className="mt-3 text-[10.5px] leading-relaxed text-fg-muted">{l(course.descriptionAr, course.descriptionEn)}</p>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
            <p className="text-[10px] text-fg-muted">{l("تقدم المقرر", "Course progress")}</p>
            <span className="tnum text-[10.5px] font-medium text-fg">{course.progress}%</span>
          </div>
          <Progress value={course.progress} className="mt-1.5" tone="accent" />
        </section>

        <section className="rounded-xl border border-line bg-surface p-3.5">
          <p className="mb-2 text-[11px] font-semibold text-fg">{l("عضو هيئة التدريس", "Instructor")}</p>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-accent-300">{teacher.nameAr.slice(2, 4)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] font-medium text-fg">{teacher.nameAr}</p>
              <p className="text-[9.5px] text-fg-muted">{teacher.title} · {teacher.officeRoom}</p>
            </div>
            <Link href="/student/complaints/new" className="rounded-lg border border-line px-2 py-1 text-[9.5px] text-fg-soft">
              {l("تواصل", "Contact")}
            </Link>
          </div>
          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-surface-2 px-2 py-1.5 text-[9.5px] text-fg-muted">
            <Icon name="clock" size={10} /> {l("الساعات المكتبية", "Office hours")}: {teacher.officeHours}
          </p>
        </section>

        <section className="rounded-xl border border-line bg-surface p-3.5">
          <p className="mb-2 text-[11px] font-semibold text-fg">{l("مواعيد المقرر", "Schedule")}</p>
          <div className="space-y-1.5">
            {slots.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-2">
                <Icon name="calendar" size={12} className="text-accent-400" />
                <span className="text-[10.5px] text-fg-soft">{weekdayName(s.day, locale)}</span>
                <span className="tnum text-[10px] text-fg-muted">{s.start} – {s.end}</span>
                <span className="ms-auto flex items-center gap-1 text-[9.5px] text-fg-muted"><Icon name="map-pin" size={10} /> {s.room}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-fg">{l("التقييم", "Assessment")}</p>
            <Badge tone="accent">{l("النصفي", "In progress")}</Badge>
          </div>
          <div className="space-y-2">
            {assessment.map((a) => (
              <div key={a.en}>
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="text-fg-soft">{l(a.ar, a.en)} <span className="text-fg-muted">({a.weight}%)</span></span>
                  <span className="tnum font-medium text-fg">{a.score !== undefined ? `${a.score}/${a.weight * 2}` : "—"}</span>
                </div>
                <Progress value={a.score !== undefined ? (a.score / (a.weight * 2)) * 100 : 0} size="sm" tone={a.score !== undefined ? "success" : "brand"} />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-fg">{l("حضورك في المقرر", "Your attendance")}</p>
            <span className={`tnum text-[11px] font-semibold ${att.rate >= 85 ? "text-success-500" : att.rate >= 75 ? "text-warn-500" : "text-danger-500"}`}>{att.rate}%</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {[
              [att.present, l("حاضر", "Present"), "text-success-500"],
              [att.late, l("متأخر", "Late"), "text-warn-500"],
              [att.absent, l("غائب", "Absent"), "text-danger-500"],
              [att.excused, l("بعذر", "Excused"), "text-fg-muted"],
            ].map(([v, k, c]) => (
              <div key={k as string} className="rounded-lg bg-surface-2 py-1.5">
                <p className={`tnum text-[13px] font-semibold ${c}`}>{v}</p>
                <p className="text-[9px] text-fg-muted">{k}</p>
              </div>
            ))}
          </div>
          <Link href="/student/attendance" className="mt-2 flex items-center justify-center gap-1 rounded-lg border border-line py-1.5 text-[10px] text-fg-soft">
            {l("سجل الحضور التفصيلي", "Detailed attendance")} <Icon name="chevron-left" size={10} className="ltr:rotate-180" />
          </Link>
        </section>

        {exams.length > 0 && (
          <section className="rounded-xl border border-line bg-surface p-3.5">
            <p className="mb-2 text-[11px] font-semibold text-fg">{l("اختبارات المقرر", "Course examinations")}</p>
            <div className="space-y-1.5">
              {exams.map((e) => (
                <Link key={e.id} href={e.status === "LIVE" ? `/student/exams/${e.id}` : "/student/exams"} className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-2 transition hover:bg-surface-3">
                  <Icon name="file-text" size={12} className="text-accent-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10.5px] font-medium text-fg">{l(e.titleAr, e.titleEn)}</p>
                    <p className="text-[9px] text-fg-muted">{fmtDate(e.startsAt, locale, { year: false })} · {e.totalMarks} {l("درجة", "marks")}</p>
                  </div>
                  <Badge tone={e.status === "LIVE" ? "danger" : e.status === "SCHEDULED" ? "accent" : "neutral"}>
                    {e.status === "LIVE" ? l("متاح", "Live") : e.status === "SCHEDULED" ? l("مجدول", "Scheduled") : l("منتهي", "Closed")}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-line bg-surface p-3.5">
          <p className="mb-2 text-[11px] font-semibold text-fg">{l("مواد المقرر", "Course material")}</p>
          <div className="space-y-1.5">
            {notes.length === 0 && <p className="text-[10px] text-fg-muted">{l("لا توجد مواد منشورة بعد.", "No material published yet.")}</p>}
            {notes.map((n) => (
              <div key={n.id} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-2">
                <span className="grid size-6 place-items-center rounded-md bg-surface-2 text-fg-muted"><Icon name={NOTE_ICON[n.type]} size={12} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10.5px] text-fg-soft">{n.titleAr}</p>
                  <p className="text-[9px] text-fg-muted">{l("الأسبوع", "Week")} {n.week} · {n.size ?? `${n.durationMin} ${l("دقيقة", "min")}`}</p>
                </div>
                <span className="text-[9px] text-fg-muted">{fmtDate(n.publishedAt, locale, { year: false })}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[9px] text-fg-muted">{l("تنزيل المواد متاح داخل التطبيق فقط بعد التحقق من الجهاز.", "Material downloads are available in-app after device verification.")}</p>
        </section>
      </div>
    </div>
  );
}
