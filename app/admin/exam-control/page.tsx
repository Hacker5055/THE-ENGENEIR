import Link from "next/link";
import { Avatar, Badge, Card, CardHeader, EmptyState, Icon, Progress, StatusBadge } from "@/components/ui";
import { PageHeader, StatCard, StatusDot } from "@/components/shells/app-shell";
import { BarChart, Donut } from "@/components/charts";
import { db, findCourse } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { makeL, relTime } from "@/lib/utils";

export const metadata = { title: "مركز مراقبة الاختبارات" };

const SEVERITY_TONE = { CRITICAL: "danger", WARNING: "warning", INFO: "neutral" } as const;

export default async function ExamControlPage({ searchParams }: { searchParams: Promise<{ exam?: string; sev?: string }> }) {
  const { user, locale } = await adminContext();
  const l = makeL(locale);
  const sp = await searchParams;
  const exams = db().examinations.filter((e) => ["LIVE", "SCHEDULED"].includes(e.status));
  const selected = exams.find((e) => e.id === sp.exam) ?? exams.find((e) => e.status === "LIVE") ?? exams[0];
  const sev = sp.sev ?? "ALL";

  if (!selected) {
    return (
      <div className="space-y-4">
        <PageHeader title={l("مركز مراقبة الاختبارات", "Exam control center")} />
        <Card><EmptyState icon="shield-check" title={l("لا اختبارات نشطة", "No active examinations")} description={l("سيظهر هنا كل اختبار مباشر مع محاولاته وحوادثه.", "Every live examination appears here with attempts and incidents.")} /></Card>
      </div>
    );
  }

  const course = findCourse(selected.courseId);
  const attempts = db().attempts.filter((a) => a.examinationId === selected.id);
  const events = db().examEvents.filter((e) => e.examinationId === selected.id).filter((e) => sev === "ALL" || e.severity === sev).sort((a, b) => b.serverTime - a.serverTime);
  const allEvents = db().examEvents.filter((e) => e.examinationId === selected.id);

  const inProgress = attempts.filter((a) => a.status === "IN_PROGRESS").length;
  const submitted = attempts.filter((a) => ["SUBMITTED", "GRADING", "GRADED"].includes(a.status)).length;
  const flagged = attempts.filter((a) => a.status === "FLAGGED").length;
  const locked = attempts.filter((a) => a.status === "LOCKED").length;

  const byType = Object.entries(
    allEvents.reduce<Record<string, number>>((acc, e) => {
      acc[e.type] = (acc[e.type] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([type, value]) => ({ label: type.replaceAll("_", " ").toLowerCase(), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const severityData = [
    { label: l("حرج", "Critical"), value: allEvents.filter((e) => e.severity === "CRITICAL").length, color: "#F05252" },
    { label: l("تحذير", "Warning"), value: allEvents.filter((e) => e.severity === "WARNING").length, color: "#F2A93B" },
    { label: l("معلومة", "Info"), value: allEvents.filter((e) => e.severity === "INFO").length, color: "#38A5FF" },
  ];

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("مركز مراقبة الاختبارات", "Exam control center")}
        subtitle={l(
          "قرارات بشرية موثّقة — لا إلغاء آلي لأي محاولة",
          "Human, documented decisions — the system never voids an attempt on its own",
        )}
        breadcrumb={[{ label: l("القيادة", "Command") }, { label: l("مركز المراقبة", "Control center") }]}
        badge={<StatusDot tone={selected.status === "LIVE" ? "success" : "warning"} label={selected.status === "LIVE" ? l("مباشر", "Live") : l("مجدول", "Scheduled")} />}
        actions={<span className="font-mono text-[10px] text-fg-muted">{user.nameEn} · {user.role}</span>}
      />

      <div className="flex flex-wrap gap-1.5">
        {exams.map((e) => (
          <Link
            key={e.id}
            href={`/admin/exam-control?exam=${e.id}`}
            className={`inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-[11.5px] font-medium transition ${
              e.id === selected.id ? "border-brand-500/40 bg-brand-500/10 text-brand-400" : "border-line bg-surface text-fg-muted hover:text-fg"
            }`}
          >
            {e.status === "LIVE" && <span className="h-1.5 w-1.5 rounded-full bg-success-500" />}
            <span className="font-mono text-[10px]">{e.code}</span>
            <span className="hidden sm:inline">{l(e.titleAr, e.titleEn)}</span>
          </Link>
        ))}
        {exams.length === 0 && <span className="text-[11.5px] text-fg-muted">{l("لا اختبارات مباشرة أو مجدولة.", "No live or scheduled examinations.")}</span>}
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold text-fg">{l(selected.titleAr, selected.titleEn)}</p>
            <p className="text-[10.5px] text-fg-muted">
              {course ? l(course.nameAr, course.nameEn) : ""} · {selected.durationMin} {l("دقيقة", "min")} · {selected.totalMarks} {l("درجة", "marks")} · {l("حد الحوادث", "violation cap")} {selected.maxViolations}
            </p>
          </div>
          <Badge tone={selected.policy === "LOCKDOWN" ? "danger" : selected.policy === "STRICT" ? "warning" : "neutral"}>
            {selected.policy === "LOCKDOWN" ? l("سياسة مقيّدة", "Lockdown policy") : selected.policy === "STRICT" ? l("سياسة صارمة", "Strict policy") : l("سياسة قياسية", "Standard policy")}
          </Badge>
          <div className="flex items-center gap-1.5 text-[10.5px] text-fg-muted">
            <Icon name="server" size={12} /> {l("ساعة الخادم مرجعية", "Server clock authoritative")}
          </div>
        </div>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label={l("داخل الاختبار", "In progress")} value={inProgress} icon="activity" tone="success" />
        <StatCard label={l("سلّموا", "Submitted")} value={submitted} icon="send" tone="brand" />
        <StatCard label={l("مُعلّمة", "Flagged")} value={flagged} icon="flag" tone={flagged ? "warning" : "neutral"} />
        <StatCard label={l("مجمّدة", "Locked")} value={locked} icon="lock" tone={locked ? "danger" : "neutral"} />
        <StatCard label={l("أحداث مرصودة", "Recorded events")} value={allEvents.length} icon="shield-alert" tone="accent" />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader
            title={l("محاولات الطلاب", "Student attempts")}
            subtitle={l("الحالة، الحوادث، والوقت المتبقي", "State, incidents, remaining time")}
            icon="users"
            action={<span className="text-[10px] text-fg-muted">{attempts.length} {l("محاولة", "attempts")}</span>}
          />
          <div className="space-y-2">
            {attempts.map((a) => {
              const student = db().students.find((s) => s.id === a.studentId);
              const remaining = Math.max(0, (a.endsAt ?? 0) - Date.now());
              const mins = Math.floor(remaining / 60000);
              const needsDecision = ["FLAGGED", "LOCKED"].includes(a.status);
              return (
                <Link
                  key={a.id}
                  href={`/admin/exam-control/${a.id}`}
                  className={`block rounded-xl border p-2.5 transition hover:-translate-y-px hover:shadow-sm ${
                    needsDecision ? "border-danger-500/30 bg-danger-500/[0.04]" : "border-line bg-surface-2/50 hover:border-brand-500/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={student?.nameAr ?? "?"} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-medium text-fg">{l(student?.nameAr ?? "", student?.nameEn ?? "")}</p>
                      <p className="truncate font-mono text-[9px] text-fg-muted">
                        {student?.studentNumber} · {a.deviceLabel}
                      </p>
                    </div>
                    <div className="text-end">
                      <StatusBadge status={a.status} />
                      <p className="mt-0.5 text-[9px] text-fg-muted">
                        {a.status === "IN_PROGRESS" ? `${mins} ${l("د متبقية", "min left")}` : a.submittedAt ? relTime(a.submittedAt, locale) : `♡ ${relTime(a.lastHeartbeat, locale)}`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1">
                      <Progress
                        value={Math.round((a.answers.length / Math.max(1, a.questionOrder.length)) * 100)}
                        size="sm"
                        tone="brand"
                      />
                    </div>
                    <span className="tnum text-[9px] text-fg-muted">{a.answers.length}/{a.questionOrder.length} {l("إجابة", "saved")}</span>
                    <span className={`tnum rounded px-1.5 py-0.5 text-[9px] font-semibold ${a.violations >= selected.maxViolations ? "bg-danger-500/15 text-danger-500" : a.violations > 0 ? "bg-warn-500/15 text-warn-500" : "bg-surface-3 text-fg-muted"}`}>
                      {a.violations}/{selected.maxViolations} {l("حادثة", "inc.")}
                    </span>
                    {needsDecision && <span className="text-[9px] font-semibold text-danger-500">{l("يحتاج قراراً", "needs decision")} →</span>}
                  </div>
                </Link>
              );
            })}
            {attempts.length === 0 && <EmptyState icon="users" title={l("لا محاولات بعد", "No attempts yet")} description={l("ستظهر المحاولات لحظة بدء الطلاب.", "Attempts appear the moment students start.")} />}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title={l("توزيع الأحداث", "Event distribution")} icon="chart" subtitle={l("أنواع الأحداث المرصودة", "Observed event types")} />
            {byType.length > 0 ? <BarChart data={byType} horizontal suffix="" ariaLabel={l("توزيع الأحداث", "Event distribution")} /> : <p className="py-6 text-center text-[11px] text-fg-muted">{l("لا أحداث.", "No events.")}</p>}
            <div className="mt-3 border-t border-line pt-3">
              <Donut segments={severityData} size={110} thickness={12} ariaLabel={l("توزيع الخطورة", "Severity distribution")} />
            </div>
          </Card>

          <Card>
            <CardHeader title={l("كيف تُتخذ القرارات؟", "How decisions are made")} icon="shield-check" />
            <ol className="space-y-2">
              {[
                l("يُرصد الحدث ويُصنَّف بالخطورة على الخادم.", "The event is detected and severity-classified server-side."),
                l("عند تجاوز الحد تُجمَّد المحاولة وتُحال لمراجعة بشرية.", "Past the threshold the attempt freezes and goes to human review."),
                l("يقرر المراقب: استئناف، وقت إضافي، اعتماد، أو إلغاء — مع سبب إلزامي.", "The supervisor decides: resume, extra time, accept, or void — with a mandatory reason."),
                l("يُخطر الطالب ويُسجَّل القرار في سجل التدقيق.", "The student is notified and the decision is written to the audit log."),
              ].map((t, i) => (
                <li key={i} className="flex gap-2 text-[10px] leading-relaxed text-fg-muted">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-500/15 font-mono text-[8.5px] font-semibold text-brand-400">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          title={l("سجل الأحداث المباشر", "Live event feed")}
          subtitle={l("الأحدث أولاً — يُحدَّث عند إعادة التحميل", "Newest first — refreshed on reload")}
          icon="list-checks"
          action={
            <div className="flex gap-1">
              {["ALL", "CRITICAL", "WARNING", "INFO"].map((s) => (
                <Link
                  key={s}
                  href={`/admin/exam-control?exam=${selected.id}&sev=${s}`}
                  className={`rounded-md px-2 py-1 text-[10px] font-medium transition ${sev === s ? "bg-brand-500/15 text-brand-400" : "text-fg-muted hover:text-fg"}`}
                >
                  {s === "ALL" ? l("الكل", "All") : s === "CRITICAL" ? l("حرج", "Critical") : s === "WARNING" ? l("تحذير", "Warning") : l("معلومة", "Info")}
                </Link>
              ))}
            </div>
          }
        />
        <div className="divide-y divide-line">
          {events.slice(0, 14).map((e) => {
            const student = db().students.find((s) => s.id === e.studentId);
            return (
              <div key={e.id} className="flex items-start gap-2.5 py-2">
                <Badge tone={SEVERITY_TONE[e.severity]}>{e.severity === "CRITICAL" ? l("حرج", "Critical") : e.severity === "WARNING" ? l("تحذير", "Warning") : l("معلومة", "Info")}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[10px] text-fg-soft">{e.type}</p>
                  <p className="truncate text-[10px] text-fg-muted">{l(e.detailAr, e.detailEn)}</p>
                </div>
                <div className="shrink-0 text-end">
                  <p className="truncate text-[10px] text-fg-soft">{student ? l(student.nameAr, student.nameEn) : e.studentId}</p>
                  <p className="text-[9px] text-fg-muted">{relTime(e.serverTime, locale)}</p>
                </div>
                <Link href={`/admin/exam-control/${e.attemptId}`} className="shrink-0 text-[10px] font-semibold text-brand-500 hover:underline">
                  {l("فتح", "Open")}
                </Link>
              </div>
            );
          })}
          {events.length === 0 && <p className="py-8 text-center text-[11.5px] text-fg-muted">{l("لا أحداث بهذه التصفية.", "No events for this filter.")}</p>}
        </div>
      </Card>

      <div className="rounded-xl border border-line bg-surface-2/40 px-4 py-3">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-fg-soft">
          <Icon name="eye" size={13} className="text-accent-400" /> {l("الشفافية مع الطلاب", "Transparency with students")}
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-fg-muted">
          {l(
            "ما يُرصد يُعرض على الطالب بنفس التفصيل: نوع الحدث، وقته، وسببه. لا مراقبة للشاشة أو الكاميرا أو الميكروفون في هذا النظام — فقط أحداث حالة التطبيق والجهاز.",
            "Students see exactly what is detected: event type, time and reason. This system never watches the screen, camera or microphone — only app and device state events.",
          )}
        </p>
      </div>
    </div>
  );
}
