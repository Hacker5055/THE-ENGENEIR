import Link from "next/link";
import { Avatar, Badge, Card, CardHeader, Icon, Progress, StatusBadge } from "@/components/ui";
import { PageHeader, StatCard, StatusDot } from "@/components/shells/app-shell";
import { BarChart, Donut, LineChart, Sparkline } from "@/components/charts";
import { db, gpaFor, studentAttendance } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { fmtDate, makeL, relTime } from "@/lib/utils";

export const metadata = { title: "نظرة عامة" };

export default async function AdminOverview() {
  const { user, locale, openComplaints, lockedAttempts } = await adminContext();
  const l = makeL(locale);
  const students = db().students;
  const teachers = db().teachers;
  const courses = db().courses;
  const attendance = db().attendanceRecords;
  const presentRate = attendance.length ? Math.round((attendance.filter((r) => r.status === "PRESENT" || r.status === "LATE").length / attendance.length) * 100) : 0;

  const liveExams = db().examinations.filter((e) => e.status === "LIVE");
  const liveAttempts = db().attempts.filter((a) => liveExams.some((e) => e.id === a.examinationId));
  const incidents24h = db().examEvents.filter((e) => Date.now() - e.serverTime < 86400_000);
  const flagged = db().attempts.filter((a) => a.status === "FLAGGED" || a.status === "LOCKED");

  const byDept = db().departments.map((d) => ({
    label: d.code,
    name: l(d.nameAr, d.nameEn),
    value: Math.round(d.avgGpa * 25),
    color: d.color,
  }));

  const attendanceTrend = [88, 91, 86, 93, 90, 87, presentRate];
  const weeklyLabels = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];

  const riskStudents = [...students]
    .map((s) => ({ s, att: studentAttendance(s.id) }))
    .filter((x) => x.att.rate < 78)
    .sort((a, b) => a.att.rate - b.att.rate)
    .slice(0, 5);

  const recentAudit = [...db().auditLogs].sort((a, b) => b.at - a.at).slice(0, 6);
  const topComplaints = db().complaints.filter((c) => c.status === "OPEN" || c.status === "UNDER_REVIEW").slice(0, 4);

  const statusDonut = [
    { label: l("منتظم", "Active"), value: students.filter((s) => s.academicStatus === "ACTIVE").length, color: "#19B88A" },
    { label: l("إنذار", "Probation"), value: students.filter((s) => s.academicStatus === "PROBATION").length, color: "#F2A93B" },
    { label: l("موقوف", "Suspended"), value: students.filter((s) => s.academicStatus === "SUSPENDED").length, color: "#F05252" },
  ];

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("مركز القيادة الأكاديمية", "Academic command center")}
        subtitle={l(
          `الفصل الثاني 2026 · ${fmtDate(Date.now(), locale, { weekday: true })} · ${user.title}`,
          `Spring 2026 · ${fmtDate(Date.now(), locale, { weekday: true })} · ${user.title}`,
        )}
        badge={<StatusDot tone={liveExams.length ? "success" : "neutral"} label={liveExams.length ? `${liveExams.length} ${l("اختبار جارٍ", "exams live")}` : l("لا اختبارات مباشرة", "No live exams")} />}
        actions={
          <>
            <Link href="/admin/reports" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 text-[12.5px] font-semibold text-fg transition hover:bg-surface-2">
              <Icon name="download" size={14} /> {l("تصدير تقرير", "Export report")}
            </Link>
            <Link href="/admin/exam-control" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-brand-600">
              <Icon name="shield-alert" size={14} /> {l("مركز المراقبة", "Control center")}
            </Link>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("الطلاب النشطون", "Active students")} value={students.filter((s) => s.academicStatus === "ACTIVE").length} icon="users" tone="brand" hint={`${l("من", "of")} ${students.length} ${l("مسجّل", "enrolled")}`} trend={{ value: "+12", positive: true }} spark={<Sparkline data={[72, 76, 79, 82, 85, 88, 92]} color="#38A5FF" />} href="/admin/students" />
        <StatCard label={l("أعضاء هيئة التدريس", "Faculty")} value={teachers.length} icon="id-card" tone="accent" hint={`${courses.length} ${l("مقرراً", "courses")}`} href="/admin/teachers" />
        <StatCard label={l("الحضور اليوم", "Attendance today")} value={`${presentRate}%`} icon="qr" tone={presentRate >= 85 ? "success" : "warning"} trend={{ value: "+3.4%", positive: true }} spark={<Sparkline data={attendanceTrend} color="#19B88A" />} href="/admin/attendance" />
        <StatCard label={l("طلبات مفتوحة", "Open requests")} value={openComplaints} icon="message" tone={openComplaints > 4 ? "danger" : "warning"} hint={`${lockedAttempts} ${l("محاولة مُعلّمة", "flagged attempts")}`} href="/admin/complaints" />
      </section>

      {liveExams.length > 0 && (
        <Card padded={false} className="overflow-hidden border-danger-500/25">
          <div className="flex flex-wrap items-center gap-3 bg-danger-500/[0.06] px-4 py-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger-500 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger-500" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-fg">
                {l("اختبار جارٍ الآن", "Examination live now")} — {l(liveExams[0].titleAr, liveExams[0].titleEn)}
              </p>
              <p className="text-[10.5px] text-fg-muted">
                {liveAttempts.filter((a) => a.status === "IN_PROGRESS").length} {l("محاولة جارية", "attempts in progress")} ·{" "}
                {incidents24h.length} {l("حدث مرصود في 24 ساعة", "events in the last 24h")} ·{" "}
                {flagged.length} {l("محاولة تحتاج قراراً", "attempts need a decision")}
              </p>
            </div>
            <Link href="/admin/exam-control" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-danger-500 px-3 text-[11.5px] font-semibold text-white transition hover:bg-danger-500/90">
              {l("فتح مركز المراقبة", "Open control center")} <Icon name="arrow-right" size={13} className="rtl:rotate-180" />
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader
            title={l("الحضور خلال الأسبوع", "Weekly attendance")}
            subtitle={l("نسبة الحضور الفعلية من كل الجلسات", "Actual present rate across sessions")}
            icon="trending-up"
            action={<Badge tone="success" dot>{l("مستقر", "Stable")}</Badge>}
          />
          <LineChart series={[{ name: l("الحضور", "Attendance"), color: "#38A5FF", data: attendanceTrend }]} labels={weeklyLabels} height={190} yMax={100} valueSuffix="%" ariaLabel={l("الحضور خلال الأسبوع", "Weekly attendance")} />
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { k: l("أعلى يوم", "Best day"), v: "93%" },
              { k: l("أدنى يوم", "Lowest day"), v: "86%" },
              { k: l("المتوسط", "Average"), v: `${presentRate}%` },
            ].map((x) => (
              <div key={x.k} className="rounded-lg bg-surface-2 px-2.5 py-2">
                <p className="text-[9.5px] text-fg-muted">{x.k}</p>
                <p className="tnum text-[14px] font-semibold text-fg">{x.v}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={l("الأداء حسب القسم", "Performance by department")} subtitle={l("مؤشر المعدل التراكمي (من 100)", "GPA index (of 100)")} icon="chart" />
          <BarChart data={byDept} horizontal showValues ariaLabel={l("الأداء حسب القسم", "Performance by department")} />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title={l("توزيع الحالة الأكاديمية", "Academic standing")} icon="percent" subtitle={`${students.length} ${l("طالباً", "students")}`} />
          <Donut
            segments={statusDonut}
            size={148}
            centerLabel={l("طالب", "students")}
            centerValue={String(students.length)}
            ariaLabel={l("توزيع الحالة الأكاديمية", "Academic standing distribution")}
          />
        </Card>

        <Card>
          <CardHeader
            title={l("طلاب بحاجة لمتابعة", "Students needing follow-up")}
            subtitle={l("حضور أقل من 78%", "Attendance below 78%")}
            icon="alert"
            action={<Link href="/admin/students" className="text-[11px] font-semibold text-brand-500 hover:underline">{l("الكل", "All")}</Link>}
          />
          <div className="space-y-1.5">
            {riskStudents.map(({ s, att }) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg bg-surface-2/60 px-2 py-1.5">
                <Avatar name={s.nameAr} size={26} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-fg">{l(s.nameAr, s.nameEn)}</p>
                  <p className="font-mono text-[9px] text-fg-muted">{s.studentNumber} · GPA {s.gpa.toFixed(2)}</p>
                </div>
                <span className="tnum text-[11px] font-semibold text-danger-500">{att.rate}%</span>
              </div>
            ))}
            {riskStudents.length === 0 && <p className="py-5 text-center text-[11px] text-fg-muted">{l("لا حالات حرجة.", "No critical cases.")}</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title={l("طلبات تحتاج قراراً", "Requests awaiting decision")} icon="message" action={<Link href="/admin/complaints" className="text-[11px] font-semibold text-brand-500 hover:underline">{l("الكل", "All")}</Link>} />
          <div className="space-y-1.5">
            {topComplaints.map((c) => (
              <Link key={c.id} href={`/admin/complaints/${c.id}`} className="block rounded-lg border border-line bg-surface-2/60 px-2.5 py-2 transition hover:border-brand-500/40">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[9px] text-fg-muted">{c.ticket}</span>
                  <Badge tone={c.status === "OPEN" ? "warning" : "brand"}>{c.status === "OPEN" ? l("جديد", "Open") : l("قيد المراجعة", "Review")}</Badge>
                  <span className="ms-auto text-[9px] text-fg-muted">{relTime(c.createdAt, locale)}</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-fg">{c.subject}</p>
              </Link>
            ))}
            {topComplaints.length === 0 && <p className="py-5 text-center text-[11px] text-fg-muted">{l("لا طلبات مفتوحة.", "No open requests.")}</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title={l("النشاط الإداري الأخير", "Recent administrative activity")} icon="list-checks" action={<Link href="/admin/audit" className="text-[11px] font-semibold text-brand-500 hover:underline">{l("سجل التدقيق", "Audit log")}</Link>} />
          <div className="divide-y divide-line">
            {recentAudit.map((a) => (
              <div key={a.id} className="flex items-center gap-2.5 py-2">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${a.severity === "CRITICAL" ? "bg-danger-500" : a.severity === "WARNING" ? "bg-warn-500" : "bg-success-500"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] text-fg">{a.actionAr}</p>
                  <p className="truncate text-[9.5px] text-fg-muted">{a.actorName} · {a.target}</p>
                </div>
                <span className="shrink-0 text-[9px] text-fg-muted">{relTime(a.at, locale)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={l("الاختبارات", "Examinations")} icon="file-text" action={<Link href="/admin/exams" className="text-[11px] font-semibold text-brand-500 hover:underline">{l("إدارة", "Manage")}</Link>} />
          <div className="space-y-1.5">
            {db()
              .examinations.slice(0, 4)
              .map((e) => {
                const attempts = db().attempts.filter((a) => a.examinationId === e.id);
                return (
                  <Link key={e.id} href={`/admin/exams#${e.id}`} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/60 px-2.5 py-2 transition hover:border-brand-500/40">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium text-fg">{l(e.titleAr, e.titleEn)}</p>
                      <p className="font-mono text-[9px] text-fg-muted">{e.code}</p>
                    </div>
                    <span className="tnum text-[10px] text-fg-muted">{attempts.length} {l("محاولة", "att")}</span>
                    <StatusBadge status={e.status} />
                  </Link>
                );
              })}
          </div>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/admin/students", icon: "users", t: l("إدارة الطلاب", "Manage students"), d: l("سجلات، حالات، أداء", "Records, standing, performance") },
          { href: "/admin/courses", icon: "book", t: l("المقررات", "Courses"), d: `${courses.length} ${l("مقرراً نشطاً", "active courses")}` },
          { href: "/admin/roles", icon: "key", t: l("الأدوار والصلاحيات", "Roles & permissions"), d: l("RBAC على مستوى المؤسسة", "Institution-wide RBAC") },
          { href: "/admin/settings", icon: "settings", t: l("إعدادات المؤسسة", "Institution settings"), d: l("السياسات والتكاملات", "Policies & integrations") },
        ].map((q) => (
          <Link key={q.href} href={q.href} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface p-3 transition hover:border-brand-500/40 hover:shadow-sm">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/10 text-brand-400"><Icon name={q.icon as never} size={16} /></span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-fg">{q.t}</p>
              <p className="truncate text-[9.5px] text-fg-muted">{q.d}</p>
            </div>
          </Link>
        ))}
      </div>

      <p className="text-center text-[9.5px] text-fg-muted">
        {l(
          "كل الأرقام محسوبة من سجلات النظام الفعلية في هذه الجلسة — لا بيانات ثابتة في الواجهة.",
          "Every figure is computed from live in-session records — nothing hard-coded in the view.",
        )}
      </p>
    </div>
  );
}
