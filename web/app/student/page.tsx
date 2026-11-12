import Link from "next/link";
import { Avatar, Badge, Icon, Progress, Ring } from "@/components/ui";
import { MobileAppBar, SectionTitle } from "@/components/shells/mobile-shell";
import { LiveCountdown } from "@/components/live-countdown";
import { Sparkline } from "@/components/charts";
import { db, findCourse, studentAttendance } from "@/lib/server/store";
import { studentContext } from "@/lib/server/context";
import { fmtDate, makeL, nf, relTime, weekdayName } from "@/lib/utils";

export const metadata = { title: "الرئيسية" };

export default async function StudentDashboard() {
  const { user, student, courses, unread, department, sectionName, locale } = await studentContext();
  const l = makeL(locale);
  const now = new Date();
  const day = now.getDay();
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  const todays = db()
    .schedule.filter((s) => courses.some((c) => c.id === s.courseId) && s.day === day)
    .sort((a, b) => a.start.localeCompare(b.start));

  const attendance = studentAttendance(student.id);
  const liveExams = db().examinations.filter((e) => e.status === "LIVE" && courses.some((c) => c.id === e.courseId));
  const liveExam = liveExams[0];
  const liveAttempt = liveExam ? db().attempts.find((a) => a.examinationId === liveExam.id && a.studentId === student.id) : undefined;
  const upcomingExam = db()
    .examinations.filter((e) => e.status === "SCHEDULED" && courses.some((c) => c.id === e.courseId))
    .sort((a, b) => a.startsAt - b.startsAt)[0];

  const recentGrades = db()
    .grades.filter((g) => g.studentId === student.id && g.published)
    .slice(-3)
    .reverse();

  const notifications = db().notifications.filter((n) => n.userId === user.id).slice(0, 2);
  const hour = now.getHours();
  const greeting = hour < 12 ? l("صباح الخير", "Good morning") : hour < 17 ? l("مساء الخير", "Good afternoon") : l("مساء الخير", "Good evening");

  const gpaTrend = [3.1, 3.18, 3.22, 3.3, 3.28, 3.36, student.gpa];
  const attendanceTone = attendance.rate >= 85 ? "success" : attendance.rate >= 75 ? "warning" : "danger";

  return (
    <div className="pb-5">
      <MobileAppBar
        title={`${greeting}، ${student.nameAr.split(" ")[0]} 👋`}
        subtitle={`${department.nameAr} · ${l("المستوى", "Level")} ${student.level}`}
        unread={unread}
        avatarName={student.nameAr}
        avatarHue={student.avatarHue}
        avatarHref="/student/profile"
      />

      <div className="space-y-4 px-4 pt-4">
        {/* identity / performance hero */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#2864D9_0%,#1B4AA8_52%,#132C5C_100%)] p-4 text-white shadow-lg">
          <div className="pointer-events-none absolute inset-0 opacity-[0.18] app-grid-bg" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-white/55">{l("الهوية الأكاديمية", "Academic identity")}</p>
                <p className="mt-1 truncate text-[15px] font-semibold">{student.nameAr}</p>
                <p className="tnum mt-0.5 text-[11px] text-white/60" dir="ltr">{student.studentNumber}</p>
              </div>
              <Link
                href="/student/id"
                className="flex shrink-0 items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-[10px] font-medium backdrop-blur transition hover:bg-white/20"
              >
                <Icon name="id-card" size={12} />
                {l("الهوية", "ID")}
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.07] p-2.5">
                <p className="text-[9.5px] text-white/55">{l("المعدل التراكمي", "GPA")}</p>
                <p className="tnum mt-0.5 text-[17px] font-semibold">{student.gpa.toFixed(2)}</p>
                <p className="text-[9px] text-white/45">{l("من 4.00", "of 4.00")}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.07] p-2.5">
                <p className="text-[9.5px] text-white/55">{l("الحضور", "Attendance")}</p>
                <p className="tnum mt-0.5 text-[17px] font-semibold">{attendance.rate}%</p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-success-500" style={{ width: `${attendance.rate}%` }} />
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.07] p-2.5">
                <p className="text-[9.5px] text-white/55">{l("الساعات", "Credits")}</p>
                <p className="tnum mt-0.5 text-[17px] font-semibold">{student.credits}</p>
                <p className="text-[9px] text-white/45">{l("من 144", "of 144")}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-[10px] text-white/55">
                {l("التقدم الأكاديمي", "Academic progress")} · {Math.round((student.credits / 144) * 100)}%
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-success-500">
                <Icon name="trending-up" size={11} />
                {l("+0.06 هذا الفصل", "+0.06 this term")}
              </div>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#38A5FF,#86C9FF)]" style={{ width: `${(student.credits / 144) * 100}%` }} />
            </div>
          </div>
        </section>

        {/* quick actions */}
        <section aria-label={l("إجراءات سريعة", "Quick actions")} className="grid grid-cols-4 gap-2">
          {[
            { href: "/student/attendance?scan=1", icon: "qr" as const, ar: "مسح الحضور", en: "Scan" },
            { href: "/student/exams", icon: "file-text" as const, ar: "الاختبارات", en: "Exams" },
            { href: "/student/timetable", icon: "calendar" as const, ar: "الجدول", en: "Schedule" },
            { href: "/student/complaints/new", icon: "message" as const, ar: "طلب جديد", en: "Request" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="tap flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface px-1 py-2.5 transition hover:border-line-strong hover:bg-surface-2"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-accent-400">
                <Icon name={a.icon} size={16} />
              </span>
              <span className="text-[9.5px] font-medium text-fg-soft">{l(a.ar, a.en)}</span>
            </Link>
          ))}
        </section>

        {/* live exam */}
        {liveExam && (
          <Link href={`/student/exams/${liveExam.id}`} className="block">
            <section className="relative overflow-hidden rounded-xl border border-danger-500/30 bg-danger-500/[0.08] p-3.5">
              <div className="flex items-start gap-3">
                <span className="relative mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-danger-500/15 text-danger-500">
                  <span className="absolute inset-0 rounded-lg bg-danger-500/20 animate-pulse-ring" />
                  <Icon name="timer" size={17} className="relative" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-danger-500">{l("جارٍ الآن", "Live now")}</span>
                    <span className="size-1 rounded-full bg-danger-500" />
                    <span className="text-[10px] text-fg-muted">{l("محاولة واحدة", "1 attempt")}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[12.5px] font-semibold text-fg">{l(liveExam.titleAr, liveExam.titleEn)}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-fg-muted">
                    <Icon name="clock" size={11} /> {liveExam.durationMin} {l("دقيقة", "min")} · {liveExam.totalMarks} {l("درجة", "marks")}
                  </p>
                </div>
                <div className="shrink-0 text-end">
                  {liveAttempt?.endsAt ? (
                    <LiveCountdown serverEndsAt={liveAttempt.endsAt} compact showIcon />
                  ) : (
                    <span className="text-[10px] font-medium text-accent-400">{l("ابدأ", "Start")} ←</span>
                  )}
                </div>
              </div>
            </section>
          </Link>
        )}

        {/* today's lectures */}
        <section>
          <SectionTitle
            action={
              <Link href="/student/timetable" className="text-[10.5px] font-medium text-accent-400">
                {l("الجدول الكامل", "Full schedule")}
              </Link>
            }
          >
            {l("محاضرات اليوم", "Today's lectures")} · {weekdayName(day, locale)}
          </SectionTitle>
          <div className="space-y-2">
            {todays.length === 0 && (
              <div className="rounded-xl border border-dashed border-line bg-surface/50 px-4 py-6 text-center">
                <p className="text-[12px] font-medium text-fg-soft">{l("لا محاضرات اليوم", "No lectures today")}</p>
                <p className="mt-0.5 text-[10.5px] text-fg-muted">{l("استخدم الوقت في مراجعة المقررات.", "A good day to revise your courses.")}</p>
              </div>
            )}
            {todays.map((slot) => {
              const course = findCourse(slot.courseId)!;
              const [sh, sm] = slot.start.split(":").map(Number);
              const [eh, em] = slot.end.split(":").map(Number);
              const startMin = sh * 60 + sm;
              const endMin = eh * 60 + em;
              const state = minutesNow >= startMin && minutesNow <= endMin ? "now" : minutesNow < startMin ? "next" : "past";
              return (
                <Link
                  key={slot.id}
                  href={`/student/courses/${course.id}`}
                  className={
                    "flex items-center gap-3 rounded-xl border p-2.5 transition " +
                    (state === "now" ? "border-accent-500/40 bg-accent-500/[0.06]" : "border-line bg-surface hover:bg-surface-2")
                  }
                >
                  <div className="w-11 shrink-0 text-center">
                    <p className="tnum text-[11px] font-semibold text-fg">{slot.start}</p>
                    <p className="tnum text-[9px] text-fg-muted">{slot.end}</p>
                  </div>
                  <span className="h-8 w-px bg-line" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-fg">{l(course.nameAr, course.nameEn)}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-fg-muted">
                      <span className="font-mono">{course.code}</span>
                      <span>·</span>
                      <Icon name="map-pin" size={9} /> {slot.room}
                      <span>·</span>
                      {slot.type === "LAB" ? l("معمل", "Lab") : l("محاضرة", "Lecture")}
                    </p>
                  </div>
                  {state === "now" && <Badge tone="accent" dot>{l("الآن", "Now")}</Badge>}
                  {state === "next" && <Badge tone="neutral">{l("قادمة", "Next")}</Badge>}
                  {state === "past" && <span className="text-[9.5px] text-fg-muted">{l("انتهت", "Ended")}</span>}
                </Link>
              );
            })}
          </div>
        </section>

        {/* attendance summary */}
        <section className="rounded-xl border border-line bg-surface p-3.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold text-fg">{l("ملخص الحضور", "Attendance summary")}</p>
              <p className="mt-0.5 text-[10px] text-fg-muted">{l("هذا الفصل الدراسي", "This semester")}</p>
            </div>
            <Badge tone={attendanceTone as "success" | "warning" | "danger"} dot>
              {attendance.rate >= 85 ? l("ممتاز", "Excellent") : attendance.rate >= 75 ? l("مقبول", "Fair") : l("تحت الحد", "Below threshold")}
            </Badge>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <Ring value={attendance.rate} size={78} thickness={7} tone={attendance.rate >= 85 ? "#19B88A" : attendance.rate >= 75 ? "#F2A93B" : "#F05252"} label={`${attendance.rate}%`}>
              <div>
                <p className="tnum text-[15px] font-semibold text-fg">{attendance.rate}%</p>
                <p className="text-[8px] text-fg-muted">{l("حضور", "rate")}</p>
              </div>
            </Ring>
            <div className="grid flex-1 grid-cols-2 gap-1.5">
              {[
                { v: attendance.present, ar: "حاضر", en: "Present", tone: "text-success-500" },
                { v: attendance.late, ar: "متأخر", en: "Late", tone: "text-warn-500" },
                { v: attendance.absent, ar: "غائب", en: "Absent", tone: "text-danger-500" },
                { v: attendance.excused, ar: "بعذر", en: "Excused", tone: "text-fg-muted" },
              ].map((s) => (
                <div key={s.ar} className="rounded-lg bg-surface-2 px-2 py-1.5">
                  <p className={`tnum text-[13px] font-semibold ${s.tone}`}>{s.v}</p>
                  <p className="text-[9px] text-fg-muted">{l(s.ar, s.en)}</p>
                </div>
              ))}
            </div>
          </div>
          <Link href="/student/attendance" className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-line py-2 text-[11px] font-medium text-fg-soft transition hover:bg-surface-2">
            {l("تفاصيل الحضور والتقويم", "Attendance details & calendar")}
            <Icon name="chevron-left" size={12} className="ltr:rotate-180" />
          </Link>
        </section>

        {/* recent grades */}
        <section>
          <SectionTitle
            action={<Link href="/student/results" className="text-[10.5px] font-medium text-accent-400">{l("كل النتائج", "All results")}</Link>}
          >
            {l("أحدث الدرجات", "Recent grades")}
          </SectionTitle>
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            {recentGrades.map((g, i) => {
              const course = findCourse(g.courseId)!;
              return (
                <div key={g.id} className={"flex items-center gap-3 px-3 py-2.5 " + (i > 0 ? "border-t border-line" : "")}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 font-mono text-[9.5px] text-fg-muted">{course.code}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-medium text-fg">{l(course.nameAr, course.nameEn)}</p>
                    <p className="text-[9.5px] text-fg-muted">{l("الفصل السابق", "Previous term")}</p>
                  </div>
                  <div className="text-end">
                    <p className="tnum text-[12.5px] font-semibold text-fg">{g.total}<span className="text-[9.5px] font-normal text-fg-muted">/100</span></p>
                    <p className={"text-[9.5px] font-medium " + (g.total >= 85 ? "text-success-500" : g.total >= 70 ? "text-accent-400" : "text-warn-500")}>{g.letter}</p>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-2 border-t border-line bg-surface-2/50 px-3 py-2">
              <Icon name="trending-up" size={12} className="text-success-500" />
              <p className="text-[10px] text-fg-muted">{l("اتجاه المعدل التراكمي", "GPA trend")}</p>
              <div className="ms-auto"><Sparkline data={gpaTrend} color="#19B88A" width={76} height={20} /></div>
              <span className="tnum text-[10px] font-medium text-success-500">+0.06</span>
            </div>
          </div>
        </section>

        {/* next scheduled exam */}
        {upcomingExam && (
          <section className="rounded-xl border border-line bg-surface p-3.5">
            <div className="flex items-center gap-2">
              <Icon name="calendar" size={14} className="text-accent-400" />
              <p className="text-[11px] font-semibold text-fg">{l("اختبار قادم", "Upcoming exam")}</p>
              <Badge tone="accent" className="ms-auto">{l("مجدول", "Scheduled")}</Badge>
            </div>
            <p className="mt-2 text-[12px] font-medium text-fg">{l(upcomingExam.titleAr, upcomingExam.titleEn)}</p>
            <p className="mt-1 text-[10.5px] text-fg-muted">
              {fmtDate(upcomingExam.startsAt, locale, { weekday: true })} · {new Date(upcomingExam.startsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="mt-0.5 text-[10px] text-fg-muted">{upcomingExam.totalMarks} {l("درجة", "marks")} · {upcomingExam.durationMin} {l("دقيقة", "min")}</p>
          </section>
        )}

        {/* notifications */}
        <section>
          <SectionTitle action={<Link href="/student/notifications" className="text-[10.5px] font-medium text-accent-400">{l("الكل", "All")}</Link>}>
            {l("آخر الإشعارات", "Latest notifications")}
          </SectionTitle>
          <div className="space-y-1.5">
            {notifications.map((n) => (
              <Link
                key={n.id}
                href={n.href ?? "/student/notifications"}
                className="flex items-start gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 transition hover:bg-surface-2"
              >
                <span className={"mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg " + (n.read ? "bg-surface-2 text-fg-muted" : "bg-brand-soft text-accent-400")}>
                  <Icon name={n.category === "EXAM" ? "file-text" : n.category === "ABSENCE" ? "alert" : n.category === "RESULT" ? "percent" : "bell"} size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[11.5px] font-medium text-fg">{l(n.titleAr, n.titleEn)}</p>
                    {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-accent-500" />}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-fg-muted">{l(n.bodyAr, n.bodyEn)}</p>
                  <p className="mt-1 text-[9px] text-fg-muted/80">{relTime(n.createdAt, locale)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <p className="pt-1 text-center text-[9.5px] text-fg-muted/70">
          {l("بيانات تجريبية · آخر مزامنة", "Demo data · last sync")} {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
