import Link from "next/link";
import { Avatar, Badge, Card, CardHeader, Icon, Progress } from "@/components/ui";
import { PageHeader, StatCard, StatusDot } from "@/components/shells/app-shell";
import { Sparkline } from "@/components/charts";
import { db, findSection } from "@/lib/server/store";
import { teacherContext } from "@/lib/server/context";
import { fmtDate, relTime, timeRange, weekdayName } from "@/lib/utils";
import { makeL } from "@/lib/utils";

export const metadata = { title: "نظرة عامة" };

export default async function TeacherDashboard() {
  const { user, teacher, courses, locale, unread } = await teacherContext();
  const l = makeL(locale);
  const now = new Date();
  const day = now.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const courseIds = new Set(courses.map((c) => c.id));

  const todays = db()
    .schedule.filter((s) => s.teacherId === teacher.id && s.day === day)
    .sort((a, b) => a.start.localeCompare(b.start));

  const nextSlot = todays[0];
  const openSessions = db().attendanceSessions.filter((s) => s.teacherId === teacher.id && s.status === "OPEN");
  const liveExams = db().examinations.filter((e) => courseIds.has(e.courseId) && e.status === "LIVE");
  const examIds = new Set(db().examinations.filter((e) => courseIds.has(e.courseId)).map((e) => e.id));
  const gradingQueue = db().attempts.filter((a) => examIds.has(a.examinationId) && (a.status === "SUBMITTED" || a.status === "GRADING"));
  const flagged = db().attempts.filter((a) => examIds.has(a.examinationId) && ["FLAGGED", "LOCKED"].includes(a.status));

  const myStudents = db().students.filter((s) => courses.some((c) => c.sectionId === s.sectionId));
  const avgRate = Math.round(
    (db()
      .attendanceRecords.filter((r) => courseIds.has(r.courseId))
      .reduce((acc, r) => acc + (r.status === "PRESENT" || r.status === "LATE" ? 1 : 0), 0) /
      Math.max(1, db().attendanceRecords.filter((r) => courseIds.has(r.courseId)).length)) *
      100,
  );

  const recentSubmissions = db()
    .attempts.filter((a) => examIds.has(a.examinationId) && a.submittedAt)
    .sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l(`مرحباً، ${teacher.nameAr.split(" ")[0]}`, `Welcome, ${teacher.nameEn.split(" ")[0]}`)}
        subtitle={`${teacher.title} · ${l("كلية الهندسة", "Faculty of Engineering")} · ${fmtDate(Date.now(), locale, { weekday: true })}`}
        badge={<Badge tone="success" dot>{l("نشط", "Active")}</Badge>}
        actions={
          <>
            <Link href="/teacher/attendance" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-brand-600">
              <Icon name="qr" size={15} /> {l("فتح جلسة حضور", "Open attendance")}
            </Link>
            <Link href="/teacher/exams/new" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 text-[12.5px] font-semibold text-fg transition hover:bg-surface-2">
              <Icon name="plus" size={15} /> {l("اختبار جديد", "New exam")}
            </Link>
          </>
        }
      />

      {openSessions.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-success-500/25 bg-success-500/[0.07] px-4 py-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-500 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
          </span>
          <p className="flex-1 text-[12px] text-fg">
            {l("جلسة حضور مفتوحة الآن", "An attendance session is open now")} —{" "}
            <span className="font-semibold">{l(openSessions[0].geo.label, openSessions[0].geo.label)}</span> ·{" "}
            <span className="font-mono">{openSessions[0].start}–{openSessions[0].end}</span>
          </p>
          <Link href={`/teacher/attendance/${openSessions[0].id}`} className="text-[12px] font-semibold text-success-500 hover:underline">
            {l("عرض شاشة QR", "Show QR screen")} →
          </Link>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("مقرراتي", "My courses")} value={courses.length} icon="book" tone="brand" hint={l("هذا الفصل", "This semester")} />
        <StatCard label={l("طلابي", "My students")} value={myStudents.length} icon="users" tone="accent" hint={`${l("متوسط الحضور", "Avg attendance")} ${avgRate}%`} />
        <StatCard
          label={l("طابور التصحيح", "Grading queue")}
          value={gradingQueue.length}
          icon="edit"
          tone={gradingQueue.length ? "warning" : "success"}
          hint={l("بانتظار مراجعة", "awaiting review")}
          href="/teacher/grading"
        />
        <StatCard
          label={l("حالات تحت المراقبة", "Under supervision")}
          value={flagged.length}
          icon="shield-alert"
          tone={flagged.length ? "danger" : "neutral"}
          hint={l("محاولات مُعلّمة", "flagged attempts")}
          href="/teacher/exams"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader
            title={l("جدول اليوم", "Today's schedule")}
            subtitle={weekdayName(day, locale)}
            icon="calendar"
            action={<Link href="/teacher/classes" className="text-[11.5px] font-semibold text-brand-500 hover:underline">{l("كل الفصول", "All classes")}</Link>}
          />
          <div className="space-y-2">
            {todays.length === 0 && (
              <div className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-[12px] text-fg-muted">
                {l("لا محاضرات اليوم — استخدم الوقت في مراجعة طابور التصحيح.", "No lectures today — a good moment for the grading queue.")}
              </div>
            )}
            {todays.map((s, i) => {
              const course = courses.find((c) => c.id === s.courseId);
              const section = findSection(s.sectionId);
              if (!course) return null;
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-3">
                  <div className="w-[74px] shrink-0 text-center">
                    <p className="tnum text-[12.5px] font-semibold text-fg">{s.start}</p>
                    <p className="tnum text-[10px] text-fg-muted">{s.end}</p>
                  </div>
                  <div className="h-10 w-px bg-line-strong" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-fg">{l(course.nameAr, course.nameEn)}</p>
                    <p className="truncate text-[10.5px] text-fg-muted">
                      {course.code} · {l(section?.nameAr ?? "", section?.nameEn ?? "")} · {l("قاعة", "Room")} {s.room}
                    </p>
                  </div>
                  {i === 0 && <Badge tone="accent">{l("التالية", "Next")}</Badge>}
                  <Link
                    href="/teacher/attendance"
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-line-strong bg-surface px-2 text-[10.5px] font-semibold text-fg-soft transition hover:text-fg"
                  >
                    <Icon name="qr" size={12} /> {l("حضور", "Attendance")}
                  </Link>
                </div>
              );
            })}
          </div>
          {nextSlot && (
            <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-fg-muted">
              <Icon name="info" size={12} />
              {l("يفتح رمز الحضور تلقائياً قبل 5 دقائق من بداية المحاضرة ويتغيّر كل 20 ثانية.", "The check-in code opens 5 minutes before class and rotates every 20 seconds.")}
            </p>
          )}
        </Card>

        <Card>
          <CardHeader title={l("الأداء الأكاديمي", "Academic pulse")} subtitle={l("متوسطات مقرراتي", "Across my courses")} icon="chart" />
          <div className="space-y-3">
            {courses.map((c) => {
              const grades = db().grades.filter((g) => g.courseId === c.id);
              const avg = Math.round(grades.reduce((a, g) => a + g.total, 0) / Math.max(1, grades.length));
              return (
                <div key={c.id}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="truncate font-medium text-fg-soft">{l(c.nameAr, c.nameEn)}</span>
                    <span className="tnum font-semibold text-fg">{avg}%</span>
                  </div>
                  <Progress value={avg} tone={avg >= 75 ? "success" : avg >= 60 ? "brand" : "warning"} size="sm" />
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
            <div>
              <p className="text-[10px] text-fg-muted">{l("متوسط تقدم المنهج", "Syllabus progress")}</p>
              <p className="tnum text-[15px] font-semibold text-fg">
                {Math.round(courses.reduce((a, c) => a + c.progress, 0) / Math.max(1, courses.length))}%
              </p>
            </div>
            <Sparkline data={[42, 48, 53, 58, 64, 69, 74]} color="#38A5FF" width={100} height={30} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title={l("أحدث التسليمات", "Recent submissions")}
            icon="inbox"
            action={<Link href="/teacher/grading" className="text-[11.5px] font-semibold text-brand-500 hover:underline">{l("فتح الطابور", "Open queue")}</Link>}
          />
          <div className="divide-y divide-line">
            {recentSubmissions.length === 0 && <p className="py-6 text-center text-[12px] text-fg-muted">{l("لا تسليمات حديثة.", "No recent submissions.")}</p>}
            {recentSubmissions.map((a) => {
              const st = db().students.find((s) => s.id === a.studentId);
              const ex = db().examinations.find((e) => e.id === a.examinationId);
              return (
                <div key={a.id} className="flex items-center gap-2.5 py-2.5">
                  <Avatar name={st?.nameAr ?? "?"} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-medium text-fg">{l(st?.nameAr ?? "", st?.nameEn ?? "")}</p>
                    <p className="truncate text-[10px] text-fg-muted">{l(ex?.titleAr ?? "", ex?.titleEn ?? "")}</p>
                  </div>
                  <span className="text-[10px] text-fg-muted">{a.submittedAt ? relTime(a.submittedAt, locale) : "—"}</span>
                  <Badge tone={a.status === "GRADED" ? "success" : a.status === "FLAGGED" ? "danger" : "warning"}>{l("بانتظار", "Pending")}</Badge>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title={l("الاختبارات الجارية والقادمة", "Live & upcoming examinations")} icon="file-text" />
          <div className="space-y-2">
            {db()
              .examinations.filter((e) => courseIds.has(e.courseId) && e.status !== "CLOSED")
              .slice(0, 4)
              .map((e) => (
                <Link key={e.id} href={`/teacher/exams/${e.id}`} className="flex items-center gap-3 rounded-lg border border-line bg-surface-2/60 px-3 py-2.5 transition hover:border-brand-500/40">
                  <div className="flex-1">
                    <p className="truncate text-[12px] font-medium text-fg">{l(e.titleAr, e.titleEn)}</p>
                    <p className="font-mono text-[9.5px] text-fg-muted">{e.code} · {e.durationMin} {l("دقيقة", "min")}</p>
                  </div>
                  <StatusDot tone={e.status === "LIVE" ? "success" : e.status === "SCHEDULED" ? "warning" : "neutral"} label={e.resultPublished ? l("منشور", "Published") : e.status === "LIVE" ? l("جارٍ", "Live") : l("مجدول", "Scheduled")} />
                </Link>
              ))}
            {liveExams.length > 0 && (
              <Link href="/admin/exam-control" className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-2 text-[11.5px] font-semibold text-fg-soft hover:text-fg">
                <Icon name="shield-alert" size={13} /> {l("مركز مراقبة الاختبارات", "Exam control center")}
              </Link>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title={l("اختصارات", "Shortcuts")} icon="zap" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/teacher/questions", icon: "layers", t: l("بنك الأسئلة", "Question bank"), d: l("أضف وأعد استخدام الأسئلة", "Add & reuse items") },
            { href: "/teacher/grades", icon: "percent", t: l("رفع الدرجات", "Enter grades"), d: l("دفتر درجات تفاعلي", "Interactive gradebook") },
            { href: "/teacher/classes", icon: "users", t: l("كشوف الفصول", "Class rosters"), d: l("حضور وأداء الطلاب", "Attendance & performance") },
            { href: "/teacher/profile", icon: "user", t: l("ملفي", "My profile"), d: l("الساعات المكتبية", "Office hours") },
          ].map((q) => (
            <Link key={q.href} href={q.href} className="group flex items-center gap-2.5 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5 transition hover:border-brand-500/40 hover:bg-surface-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/10 text-brand-400">
                <Icon name={q.icon as never} size={15} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-semibold text-fg">{q.t}</p>
                <p className="truncate text-[9.5px] text-fg-muted">{q.d}</p>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <p className="text-center text-[10px] text-fg-muted">
        {l("جميع أوقات المحاضرات معروضة بتوقيت القاهرة.", "All session times are shown in Cairo time.")} · {unread} {l("إشعار غير مقروء", "unread notifications")}
      </p>
    </div>
  );
}
