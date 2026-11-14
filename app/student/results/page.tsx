import Link from "next/link";
import { Badge, Icon, Progress } from "@/components/ui";
import { MobileAppBar } from "@/components/shells/mobile-shell";
import { db, findCourse, findExam, findQuestion } from "@/lib/server/store";
import { studentContext } from "@/lib/server/context";
import { fmtDateTime, makeL } from "@/lib/utils";

export const metadata = { title: "نتائج الاختبارات" };

const TYPE_LABEL: Record<string, { ar: string; en: string }> = {
  MCQ: { ar: "اختيار متعدد", en: "Multiple choice" },
  TRUE_FALSE: { ar: "صح/خطأ", en: "True/false" },
  ESSAY: { ar: "مقالي", en: "Essay" },
  FILL_BLANK: { ar: "أكمل", en: "Fill blank" },
  MATCHING: { ar: "مطابقة", en: "Matching" },
  IMAGE: { ar: "بصري", en: "Image" },
  FILE: { ar: "ملف", en: "File" },
};

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ exam?: string }> }) {
  const { student, locale, unread } = await studentContext();
  const l = makeL(locale);
  const { exam: examId } = await searchParams;
  const attempts = db()
    .attempts.filter((a) => a.studentId === student.id && ["SUBMITTED", "GRADING", "GRADED"].includes(a.status))
    .sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0));

  const selected = examId ? attempts.find((a) => a.examinationId === examId) : undefined;
  const exam = selected ? findExam(selected.examinationId) : undefined;

  if (selected && exam) {
    const published = exam.resultPublished;
    const questions = selected.questionOrder.map((qid) => findQuestion(qid)!).filter(Boolean);
    const answered = selected.answers.length;
    return (
      <div className="pb-6">
        <MobileAppBar back={{ href: "/student/results" }} title={l("تفاصيل النتيجة", "Result detail")} subtitle={exam.code} unread={unread} />
        <div className="space-y-4 px-4 pt-4">
          <section className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4 text-center">
            <div className="pointer-events-none absolute inset-0 opacity-[0.07] app-grid-bg" aria-hidden="true" />
            <Badge tone={published ? "success" : "warning"} dot>
              {published ? l("النتيجة معلنة", "Published") : l("بانتظار إعلان المعلم", "Awaiting release")}
            </Badge>
            <h1 className="mt-2 text-[13.5px] font-semibold text-fg">{l(exam.titleAr, exam.titleEn)}</h1>
            <p className="mt-0.5 text-[10px] text-fg-muted">{fmtDateTime(selected.submittedAt ?? 0, locale)}</p>

            {published ? (
              <>
                <p className="tnum mt-3 text-[34px] font-semibold leading-none text-fg">
                  {selected.score}
                  <span className="text-[15px] font-normal text-fg-muted"> / {exam.totalMarks}</span>
                </p>
                <p className={`mt-1 text-[11px] font-medium ${selected.passed ? "text-success-500" : "text-danger-500"}`}>
                  {selected.passed ? l("ناجح", "Passed") : l("لم يجتز", "Not passed")} · {l("درجة النجاح", "pass mark")} {exam.passingMarks}
                </p>
                <div className="mx-auto mt-3 max-w-[240px]">
                  <Progress value={((selected.score ?? 0) / exam.totalMarks) * 100} tone={selected.passed ? "success" : "danger"} />
                </div>
              </>
            ) : (
              <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-[10.5px] leading-relaxed text-fg-muted">
                {l(
                  "تم تسليم إجاباتك وتصحيح الأسئلة الموضوعية على الخادم. تُعرض الدرجة بعد اعتماد المعلم ونشر النتيجة.",
                  "Your answers were submitted and objective questions graded server-side. The score is revealed once your teacher releases the result.",
                )}
              </p>
            )}
          </section>

          <section className="grid grid-cols-3 gap-2">
            {[
              [String(questions.length), l("أسئلة", "questions")],
              [String(answered), l("مجابة", "answered")],
              [String(selected.violations), l("حوادث", "incidents")],
            ].map(([v, k]) => (
              <div key={k} className="rounded-xl border border-line bg-surface p-2.5 text-center">
                <p className="tnum text-[15px] font-semibold text-fg">{v}</p>
                <p className="text-[9px] text-fg-muted">{k}</p>
              </div>
            ))}
          </section>

          <section className="rounded-xl border border-line bg-surface p-3.5">
            <p className="mb-2 text-[11px] font-semibold text-fg">{l("تفصيل الدرجات", "Mark breakdown")}</p>
            <div className="space-y-1.5">
              {questions.map((q, i) => {
                const answer = selected.answers.find((a) => a.questionId === q.id);
                const awarded = answer?.awardedMarks;
                return (
                  <div key={q.id} className="rounded-lg border border-line px-2.5 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10.5px] font-medium text-fg">
                          <span className="tnum text-fg-muted">{i + 1}.</span> {l(q.promptAr, q.promptEn).slice(0, 78)}
                          {l(q.promptAr, q.promptEn).length > 78 ? "…" : ""}
                        </p>
                        <p className="mt-0.5 text-[9px] text-fg-muted">{l(TYPE_LABEL[q.type].ar, TYPE_LABEL[q.type].en)} · {q.marks} {l("درجة", "marks")}</p>
                      </div>
                      <span className={`tnum shrink-0 text-[11px] font-semibold ${awarded === undefined ? "text-fg-muted" : awarded === q.marks ? "text-success-500" : awarded > 0 ? "text-warn-500" : "text-danger-500"}`}>
                        {published ? (awarded !== undefined ? `${awarded}/${q.marks}` : "—") : "—"}
                      </span>
                    </div>
                    {answer?.feedback && (
                      <p className="mt-1 rounded bg-surface-2 px-2 py-1 text-[9.5px] leading-relaxed text-fg-muted">
                        <Icon name="message" size={9} className="me-1 inline" />
                        {answer.feedback}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {!published && (
              <p className="mt-2 text-[9.5px] leading-relaxed text-fg-muted">
                {l("تُعرض الدرجات التفصيلية بعد النشر فقط، حفاظاً على سرية بنك الأسئلة.", "Per-question marks appear after release to protect question-bank confidentiality.")}
              </p>
            )}
          </section>

          <div className="rounded-xl border border-line bg-surface-2/50 p-3">
            <p className="flex items-center gap-1.5 text-[10.5px] font-medium text-fg-soft">
              <Icon name="message" size={12} className="text-accent-400" /> {l("لديك اعتراض؟", "Think a mark is wrong?")}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-fg-muted">
              {l("يمكنك تقديم التماس رسمي خلال 14 يوماً من إعلان النتيجة.", "You can file a formal appeal within 14 days of the result being released.")}
            </p>
            <Link href="/student/complaints/new?category=GRADE_APPEAL" className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-medium text-accent-400">
              {l("تقديم التماس", "File an appeal")} <Icon name="arrow-left" size={10} className="ltr:rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <MobileAppBar back={{ href: "/student" }} title={l("نتائج الاختبارات", "Examination results")} subtitle={`${attempts.length} ${l("محاولة مسلّمة", "submitted attempts")}`} unread={unread} />
      <div className="space-y-2.5 px-4 pt-4">
        {attempts.length === 0 && (
          <div className="rounded-xl border border-dashed border-line bg-surface/50 px-4 py-10 text-center">
            <span className="mx-auto mb-2 grid size-10 place-items-center rounded-xl bg-surface-2 text-fg-muted"><Icon name="percent" size={18} /></span>
            <p className="text-[12px] font-medium text-fg-soft">{l("لا نتائج بعد", "No results yet")}</p>
            <p className="mt-1 text-[10.5px] text-fg-muted">{l("ستظهر النتائج بعد تسليم الاختبار واعتمادها.", "Results appear after you submit and your teacher releases them.")}</p>
          </div>
        )}
        {attempts.map((a) => {
          const e = findExam(a.examinationId)!;
          const c = findCourse(e.courseId)!;
          const published = e.resultPublished;
          return (
            <Link key={a.id} href={`/student/results?exam=${e.id}`} className="block rounded-xl border border-line bg-surface p-3.5 transition hover:border-line-strong">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-fg">{l(e.titleAr, e.titleEn)}</p>
                  <p className="mt-0.5 font-mono text-[9.5px] text-fg-muted">{c.code} · {e.code}</p>
                  <p className="mt-1 text-[9.5px] text-fg-muted">{a.submittedAt ? fmtDateTime(a.submittedAt, locale) : "—"}</p>
                </div>
                <div className="shrink-0 text-end">
                  {published ? (
                    <>
                      <p className={`tnum text-[17px] font-semibold leading-none ${a.passed ? "text-success-500" : "text-danger-500"}`}>{a.score}</p>
                      <p className="text-[9px] text-fg-muted">/ {e.totalMarks}</p>
                    </>
                  ) : (
                    <Badge tone="warning">{l("قيد الاعتماد", "Pending")}</Badge>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Badge tone={a.status === "GRADED" ? "success" : "warning"} dot>
                  {a.status === "GRADED" ? l("مُصحّح", "Graded") : l("قيد التصحيح", "Grading")}
                </Badge>
                {a.violations > 0 && <Badge tone="warning" icon="alert">{a.violations} {l("حادثة", "incidents")}</Badge>}
                <span className="ms-auto text-[9.5px] font-medium text-accent-400">{l("التفاصيل", "Details")} →</span>
              </div>
            </Link>
          );
        })}
        <Link href="/student/transcript" className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-2/50 py-2.5 text-[11px] font-medium text-fg-soft">
          <Icon name="file-text" size={13} /> {l("عرض السجل الأكاديمي الكامل", "View full transcript")}
        </Link>
      </div>
    </div>
  );
}
