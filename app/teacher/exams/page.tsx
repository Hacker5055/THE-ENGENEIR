import Link from "next/link";
import { Badge, Card, EmptyState, Icon, Progress, StatusBadge, TableWrap, Td, Th } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/shells/app-shell";
import { db, findCourse } from "@/lib/server/store";
import { teacherContext } from "@/lib/server/context";
import { fmtDateTime, makeL } from "@/lib/utils";

export const metadata = { title: "الاختبارات" };

export default async function TeacherExamsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { teacher, courses, locale } = await teacherContext();
  const l = makeL(locale);
  const sp = await searchParams;
  const status = sp.status ?? "ALL";
  const courseIds = new Set(courses.map((c) => c.id));
  const all = db().examinations.filter((e) => courseIds.has(e.courseId));

  const tabs = [
    { key: "ALL", label: l("الكل", "All"), n: all.length },
    { key: "LIVE", label: l("جارية", "Live"), n: all.filter((e) => e.status === "LIVE").length },
    { key: "SCHEDULED", label: l("مجدولة", "Scheduled"), n: all.filter((e) => e.status === "SCHEDULED").length },
    { key: "CLOSED", label: l("منتهية", "Closed"), n: all.filter((e) => e.status === "CLOSED").length },
    { key: "DRAFT", label: l("مسودات", "Drafts"), n: all.filter((e) => e.status === "DRAFT").length },
  ];
  const list = status === "ALL" ? all : all.filter((e) => e.status === status);

  const live = all.filter((e) => e.status === "LIVE");
  const totalAttempts = db().attempts.filter((a) => all.some((e) => e.id === a.examinationId)).length;
  const flagged = db().attempts.filter((a) => all.some((e) => e.id === a.examinationId) && ["FLAGGED", "LOCKED"].includes(a.status)).length;

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("الاختبارات", "Examinations")}
        subtitle={l("إنشاء، جدولة، مراقبة، ونشر النتائج", "Create, schedule, monitor and publish")}
        breadcrumb={[{ label: l("التقييم", "Assessment") }, { label: l("الاختبارات", "Examinations") }]}
        actions={
          <Link href="/teacher/exams/new" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-brand-600">
            <Icon name="plus" size={15} /> {l("اختبار جديد", "New examination")}
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("إجمالي الاختبارات", "Total examinations")} value={all.length} icon="file-text" tone="brand" />
        <StatCard label={l("جارية الآن", "Live now")} value={live.length} icon="activity" tone={live.length ? "success" : "neutral"} />
        <StatCard label={l("محاولات مسجّلة", "Recorded attempts")} value={totalAttempts} icon="users" tone="accent" />
        <StatCard label={l("محاولات مُعلّمة", "Flagged attempts")} value={flagged} icon="shield-alert" tone={flagged ? "danger" : "success"} />
      </section>

      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "ALL" ? "/teacher/exams" : `/teacher/exams?status=${t.key}`}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11.5px] font-medium transition ${
              status === t.key ? "border-brand-500/40 bg-brand-500/10 text-brand-400" : "border-line bg-surface text-fg-muted hover:text-fg"
            }`}
          >
            {t.label}
            <span className="tnum rounded bg-surface-3 px-1 text-[9.5px]">{t.n}</span>
          </Link>
        ))}
      </div>

      <Card padded={false} className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState icon="file-text" title={l("لا اختبارات في هذه الحالة", "No examinations in this state")} description={l("أنشئ اختباراً جديداً أو غيّر التصفية.", "Create a new examination or change the filter.")} />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>{l("الاختبار", "Examination")}</Th>
                <Th>{l("المقرر", "Course")}</Th>
                <Th>{l("النافذة", "Window")}</Th>
                <Th align="center">{l("المدة", "Duration")}</Th>
                <Th align="center">{l("الأسئلة", "Items")}</Th>
                <Th align="center">{l("المحاولات", "Attempts")}</Th>
                <Th>{l("السياسة", "Policy")}</Th>
                <Th align="end">{l("الحالة", "Status")}</Th>
                <Th align="end" />
              </tr>
            </thead>
            <tbody>
              {list.map((e) => {
                const course = findCourse(e.courseId);
                const attempts = db().attempts.filter((a) => a.examinationId === e.id);
                const graded = attempts.filter((a) => a.score !== undefined);
                const avg = graded.length ? Math.round(graded.reduce((a, x) => a + (x.score ?? 0), 0) / graded.length) : null;
                return (
                  <tr key={e.id} className="transition hover:bg-surface-2/60">
                    <Td>
                      <p className="text-[11.5px] font-semibold text-fg">{l(e.titleAr, e.titleEn)}</p>
                      <p className="font-mono text-[9.5px] text-fg-muted">{e.code} · {e.totalMarks} {l("درجة", "marks")}</p>
                    </Td>
                    <Td><span className="text-[11px] text-fg-soft">{course ? l(course.nameAr, course.nameEn) : "—"}</span></Td>
                    <Td>
                      <p className="text-[10.5px] text-fg-soft">{fmtDateTime(e.startsAt, locale)}</p>
                      <p className="text-[9px] text-fg-muted">{e.status === "LIVE" ? l("جارٍ الآن", "in progress") : e.status === "SCHEDULED" ? l("لم يبدأ", "not started") : l("انتهى", "ended")}</p>
                    </Td>
                    <Td align="center"><span className="tnum text-[11px] text-fg-soft">{e.durationMin}m</span></Td>
                    <Td align="center"><span className="tnum text-[11px] text-fg-soft">{e.questionIds.length}</span></Td>
                    <Td align="center">
                      <span className="tnum text-[11px] font-semibold text-fg">{attempts.length}</span>
                      {avg !== null && <p className="tnum text-[9px] text-fg-muted">{l("متوسط", "avg")} {avg}/{e.totalMarks}</p>}
                    </Td>
                    <Td>
                      <Badge tone={e.policy === "LOCKDOWN" ? "danger" : e.policy === "STRICT" ? "warning" : "neutral"}>
                        {e.policy === "LOCKDOWN" ? l("مقيّد", "Lockdown") : e.policy === "STRICT" ? l("صارم", "Strict") : l("قياسي", "Standard")}
                      </Badge>
                    </Td>
                    <Td align="end">
                      <StatusBadge status={e.status} />
                      {e.resultPublished && <p className="mt-0.5 text-[9px] text-success-500">{l("النتائج منشورة", "published")}</p>}
                    </Td>
                    <Td align="end">
                      <Link href={`/teacher/exams/${e.id}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-500 hover:underline">
                        {l("إدارة", "Manage")} <Icon name="chevron-right" size={11} className="rtl:rotate-180" />
                      </Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/10 text-brand-400"><Icon name="shield-check" size={17} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-fg">{l("نزاهة الاختبارات", "Examination integrity")}</p>
            <p className="text-[10.5px] leading-relaxed text-fg-muted">
              {l(
                "مؤقت الخادم هو المرجع، الإجابات تُحفظ فوراً، وكل حادثة تُصنَّف بالخطورة قبل أي قرار. لا تُلغى محاولة آلياً دون مراجعة بشرية.",
                "The server clock is authoritative, answers save immediately, and every incident is severity-classified before any decision. No attempt is voided automatically without human review.",
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24"><Progress value={all.length ? Math.round((all.filter((e) => e.resultPublished).length / all.length) * 100) : 0} size="sm" tone="brand" /></div>
            <Link href="/teacher/questions" className="text-[11.5px] font-semibold text-brand-500 hover:underline">{l("بنك الأسئلة", "Question bank")} →</Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
