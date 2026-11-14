import Link from "next/link";
import { Avatar, Badge, Card, CardHeader, EmptyState, Icon, StatusBadge, TableWrap, Td, Th } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/shells/app-shell";
import { db } from "@/lib/server/store";
import { teacherContext } from "@/lib/server/context";
import { makeL, relTime } from "@/lib/utils";

export const metadata = { title: "طابور التصحيح" };

export default async function GradingQueuePage({ searchParams }: { searchParams: Promise<{ exam?: string; status?: string }> }) {
  const { teacher, courses, locale } = await teacherContext();
  const l = makeL(locale);
  const sp = await searchParams;
  const courseIds = new Set(courses.map((c) => c.id));
  const exams = db().examinations.filter((e) => courseIds.has(e.courseId));
  const examIds = new Set(exams.map((e) => e.id));

  const all = db().attempts.filter((a) => examIds.has(a.examinationId));
  const pending = all.filter((a) => a.status === "SUBMITTED" || a.status === "GRADING");
  const flagged = all.filter((a) => a.status === "FLAGGED" || a.status === "LOCKED");
  const done = all.filter((a) => a.status === "GRADED");

  const filtered = sp.exam ? all.filter((a) => a.examinationId === sp.exam) : all;
  const status = sp.status ?? "PENDING";
  const list =
    status === "ALL" ? filtered : status === "FLAGGED" ? filtered.filter((a) => a.status === "FLAGGED" || a.status === "LOCKED") : status === "DONE" ? filtered.filter((a) => a.status === "GRADED") : filtered.filter((a) => a.status === "SUBMITTED" || a.status === "GRADING");

  const essayPending = pending.reduce((acc, a) => {
    const exam = exams.find((e) => e.id === a.examinationId);
    if (!exam) return acc;
    return acc + exam.questionIds.filter((qid) => {
      const q = db().questions.find((x) => x.id === qid);
      if (q?.type !== "ESSAY") return false;
      const ans = a.answers.find((x) => x.questionId === qid);
      return ans === undefined || ans.awardedMarks === undefined;
    }).length;
  }, 0);

  const tabs = [
    { key: "PENDING", label: l("بانتظار التصحيح", "Awaiting grading"), n: pending.length },
    { key: "FLAGGED", label: l("مُعلّمة للمراجعة", "Flagged"), n: flagged.length },
    { key: "DONE", label: l("مكتملة", "Completed"), n: done.length },
    { key: "ALL", label: l("الكل", "All"), n: all.length },
  ];

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("طابور التصحيح", "Grading queue")}
        subtitle={l("الأسئلة المقالية تحتاج قراراً بشرياً — الموضوعية تُصحح آلياً", "Essays need a human decision — objective items are auto-graded")}
        breadcrumb={[{ label: l("التقييم", "Assessment") }, { label: l("التصحيح", "Grading") }]}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("محاولات بانتظارك", "Awaiting you")} value={pending.length} icon="edit" tone={pending.length ? "warning" : "success"} />
        <StatCard label={l("إجابات مقالية", "Essay answers")} value={essayPending} icon="file-text" tone="brand" hint={l("تحتاج درجة", "need marks")} />
        <StatCard label={l("محاولات مُعلّمة", "Flagged attempts")} value={flagged.length} icon="shield-alert" tone={flagged.length ? "danger" : "neutral"} hint={l("مراجعة نزاهة", "integrity review")} />
        <StatCard label={l("مكتملة", "Completed")} value={done.length} icon="check-circle" tone="success" />
      </section>

      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/teacher/grading?status=${t.key}${sp.exam ? `&exam=${sp.exam}` : ""}`}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11.5px] font-medium transition ${
              status === t.key ? "border-brand-500/40 bg-brand-500/10 text-brand-400" : "border-line bg-surface text-fg-muted hover:text-fg"
            }`}
          >
            {t.label}
            <span className="tnum rounded bg-surface-3 px-1 text-[9.5px]">{t.n}</span>
          </Link>
        ))}
        <form action="/teacher/grading" className="ms-auto flex items-center gap-1.5">
          <input type="hidden" name="status" value={status} />
          <select name="exam" defaultValue={sp.exam ?? ""} className="h-8 rounded-lg border border-line bg-surface px-2 text-[11px] text-fg-soft">
            <option value="">{l("كل الاختبارات", "All examinations")}</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>{e.code}</option>
            ))}
          </select>
          <button type="submit" className="inline-flex h-8 items-center gap-1 rounded-lg border border-line-strong bg-surface px-2.5 text-[11px] font-semibold text-fg-soft hover:text-fg">
            <Icon name="filter" size={12} /> {l("تصفية", "Filter")}
          </button>
        </form>
      </div>

      <Card padded={false} className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState icon="check-circle" title={l("الطابور فارغ", "Queue is empty")} description={l("لا محاولات في هذه الحالة — عمل ممتاز.", "No attempts in this state — nice work.")} />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>{l("الطالب", "Student")}</Th>
                <Th>{l("الاختبار", "Examination")}</Th>
                <Th align="center">{l("الأسئلة المقالية", "Essays")}</Th>
                <Th align="center">{l("الحوادث", "Incidents")}</Th>
                <Th align="center">{l("الدرجة الحالية", "Current score")}</Th>
                <Th align="end">{l("الحالة", "Status")}</Th>
                <Th align="end" />
              </tr>
            </thead>
            <tbody>
              {list.map((a) => {
                const student = db().students.find((s) => s.id === a.studentId);
                const exam = exams.find((e) => e.id === a.examinationId);
                const essays = exam ? exam.questionIds.filter((qid) => db().questions.find((q) => q.id === qid)?.type === "ESSAY").length : 0;
                const gradedEssays = a.answers.filter((x) => x.awardedMarks !== undefined).length;
                return (
                  <tr key={a.id} className="transition hover:bg-surface-2/60">
                    <Td>
                      <div className="flex items-center gap-2">
                        <Avatar name={student?.nameAr ?? "?"} size={26} />
                        <div>
                          <p className="text-[11.5px] font-medium text-fg">{l(student?.nameAr ?? "", student?.nameEn ?? "")}</p>
                          <p className="font-mono text-[9px] text-fg-muted">{student?.studentNumber} · {relTime(a.submittedAt ?? a.startedAt ?? Date.now(), locale)}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p className="text-[10.5px] text-fg-soft">{exam ? l(exam.titleAr, exam.titleEn) : "—"}</p>
                      <p className="font-mono text-[9px] text-fg-muted">{exam?.code}</p>
                    </Td>
                    <Td align="center"><span className="tnum text-[11px] text-fg-soft">{gradedEssays}/{essays}</span></Td>
                    <Td align="center">
                      <Badge tone={a.violations > 0 ? "warning" : "neutral"}>{a.violations}</Badge>
                    </Td>
                    <Td align="center"><span className="tnum text-[11.5px] font-semibold text-fg">{a.score ?? "—"}</span><span className="text-[9px] text-fg-muted">/{exam?.totalMarks ?? a.maxScore}</span></Td>
                    <Td align="end"><StatusBadge status={a.status} /></Td>
                    <Td align="end">
                      <Link href={`/teacher/grading/${a.id}`} className="inline-flex items-center gap-1 rounded-md bg-brand-500/10 px-2 py-1 text-[10.5px] font-semibold text-brand-400 transition hover:bg-brand-500/20">
                        {l("تصحيح", "Grade")} <Icon name="chevron-right" size={10} className="rtl:rotate-180" />
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
        <CardHeader title={l("مبدأ التصحيح", "Grading principles")} icon="shield-check" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { t: l("لا تصحيح آلي للمقالي", "No auto-grading for essays"), d: l("الأسئلة المقالية تتطلب درجة بشرية مع تعليق اختياري.", "Essay items require a human mark with optional feedback.") },
            { t: l("إعادة حساب فورية", "Instant recompute"), d: l("تُحدَّث الدرجة الكلية والمجموع تلقائياً بعد كل تصحيح.", "Total and pass flag recompute after every graded answer.") },
            { t: l("أثر تدقيقي", "Audit trail"), d: l("كل درجة وكل تعليق يُسجَّل باسم المصحح ووقت التصحيح.", "Every mark and comment stores the grader and timestamp.") },
          ].map((x) => (
            <div key={x.t} className="rounded-lg border border-line bg-surface-2/50 p-3">
              <p className="text-[11.5px] font-semibold text-fg">{x.t}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-fg-muted">{x.d}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
