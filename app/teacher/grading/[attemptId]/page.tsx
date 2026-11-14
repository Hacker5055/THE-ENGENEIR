import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardHeader, Field, Icon, Input, KeyValue, Progress, StatusBadge, Textarea } from "@/components/ui";
import { PageHeader } from "@/components/shells/app-shell";
import { db, findAttempt, findExam, findStudent } from "@/lib/server/store";
import { teacherContext } from "@/lib/server/context";
import { gradeWrittenAnswer } from "@/app/actions/teacher";
import { fmtDateTime, makeL, relTime } from "@/lib/utils";

export default async function GradeAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const { teacher, courses, locale } = await teacherContext();
  const l = makeL(locale);
  const attempt = findAttempt(attemptId);
  if (!attempt) notFound();
  const exam = findExam(attempt.examinationId);
  if (!exam || exam.teacherId !== teacher.id) notFound();

  const student = findStudent(attempt.studentId);
  const course = courses.find((c) => c.id === exam.courseId);
  const questions = attempt.questionOrder.map((qid) => db().questions.find((q) => q.id === qid)).filter(Boolean);
  const events = db().examEvents.filter((e) => e.attemptId === attempt.id).sort((a, b) => b.serverTime - a.serverTime);
  const awarded = attempt.answers.reduce((a, x) => a + (x.awardedMarks ?? 0), 0);
  const essayTotal = questions.filter((q) => q?.type === "ESSAY").reduce((a, q) => a + (q?.marks ?? 0), 0);

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("تصحيح محاولة", "Grade attempt")}
        subtitle={`${l(student?.nameAr ?? "", student?.nameEn ?? "")} · ${student?.studentNumber} · ${l(exam.titleAr, exam.titleEn)}`}
        breadcrumb={[{ label: l("التصحيح", "Grading"), href: "/teacher/grading" }, { label: attempt.id }]}
        badge={<StatusBadge status={attempt.status} />}
        actions={
          <Link href="/teacher/grading" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 text-[12.5px] font-semibold text-fg hover:bg-surface-2">
            <Icon name="arrow-right" size={14} className="rtl:rotate-180" /> {l("الطابور", "Queue")}
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
        <div className="space-y-3">
          {questions.map((q, i) => {
            if (!q) return null;
            const ans = attempt.answers.find((a) => a.questionId === q.id);
            const isEssay = q.type === "ESSAY";
            const answered = !!ans && (ans.value.length > 0 || !!ans.textValue);
            const selected = ans?.value ?? [];
            const correct = q.correct;
            const isCorrect = !isEssay && selected.length > 0 && selected.every((v) => correct.includes(v));
            return (
              <Card key={q.id}>
                <div className="flex items-start gap-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-surface-3 font-mono text-[10px] font-semibold text-fg-soft">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] leading-snug text-fg">{l(q.promptAr, q.promptEn)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone="neutral">{q.type}</Badge>
                      <span className="text-[9.5px] text-fg-muted">{q.marks} {l("درجة", "marks")}</span>
                      {ans?.awardedMarks !== undefined && <Badge tone="success">{ans.awardedMarks} / {q.marks}</Badge>}
                      {!answered && <Badge tone="warning">{l("لم يُجب", " unanswered")}</Badge>}
                    </div>

                    {isEssay ? (
                      <div className="mt-2 rounded-lg border border-line bg-surface-2/50 p-2.5">
                        <p className="whitespace-pre-wrap text-[11.5px] leading-relaxed text-fg-soft">
                          {ans?.textValue || <span className="italic text-fg-muted">{l("لا إجابة.", "No answer.")}</span>}
                        </p>
                        {ans?.feedback && (
                          <p className="mt-2 border-t border-line pt-2 text-[10px] text-fg-muted">
                            <span className="font-semibold text-fg-soft">{l("تعليقك السابق:", "Your previous feedback:")}</span> {ans.feedback}
                          </p>
                        )}
                        <form action={gradeWrittenAnswer} className="mt-2.5 flex flex-wrap items-end gap-2 border-t border-line pt-2.5">
                          <input type="hidden" name="attemptId" value={attempt.id} />
                          <input type="hidden" name="questionId" value={q.id} />
                          <Field label={l("الدرجة", "Marks")} className="w-20">
                            <Input name="marks" type="number" min={0} max={q.marks} step={0.5} defaultValue={ans?.awardedMarks ?? ""} required className="h-8 text-center" />
                          </Field>
                          <Field label={l("تعليق", "Feedback")} className="min-w-[180px] flex-1">
                            <Textarea name="feedback" rows={1} defaultValue={ans?.feedback ?? ""} placeholder={l("ملاحظة للطالب…", "Note to the student…")} className="min-h-8 text-[11px]" />
                          </Field>
                          <button type="submit" className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-500 px-3 text-[11.5px] font-semibold text-white transition hover:bg-brand-600">
                            <Icon name="check" size={13} /> {l("حفظ", "Save")}
                          </button>
                          <span className="w-full text-[9px] text-fg-muted">{l(`الحد الأقصى ${q.marks} درجة لهذا السؤال.`, `Maximum ${q.marks} marks for this item.`)}</span>
                        </form>
                      </div>
                    ) : (
                      <ul className="mt-2 space-y-1">
                        {q.options.map((o) => {
                          const picked = selected.includes(o.id);
                          const isKey = correct.includes(o.id);
                          return (
                            <li
                              key={o.id}
                              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] ${
                                isKey ? "bg-success-500/[0.09] text-success-500" : picked ? "bg-danger-500/[0.08] text-danger-500" : "text-fg-muted"
                              }`}
                            >
                              <Icon name={isKey ? "check-circle" : picked ? "x" : "minus"} size={11} className="shrink-0" />
                              {l(o.textAr, o.textEn)}
                              {picked && <span className="ms-auto text-[9px] opacity-80">{l("إجابة الطالب", "student answer")}</span>}
                            </li>
                          );
                        })}
                        {selected.length === 0 && <li className="text-[10px] italic text-fg-muted">{l("لا إجابة.", "No answer.")}</li>}
                        <li className="pt-1 text-[9px] text-fg-muted">
                          {l("التصحيح الآلي:", "Auto-grade:")} <span className={isCorrect ? "font-semibold text-success-500" : "font-semibold text-danger-500"}>{isCorrect ? `${q.marks}/${q.marks}` : `0/${q.marks}`}</span>
                        </li>
                      </ul>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={l("ملخص المحاولة", "Attempt summary")} icon="clipboard" />
            <div className="mb-3 rounded-lg bg-surface-2 p-2.5 text-center">
              <p className="text-[9.5px] text-fg-muted">{l("الدرجة المسجّلة", "Recorded score")}</p>
              <p className="tnum text-[24px] font-semibold text-fg">
                {attempt.score ?? awarded}
                <span className="text-[12px] font-normal text-fg-muted"> / {exam.totalMarks}</span>
              </p>
              <div className="mt-1.5"><Progress value={Math.round(((attempt.score ?? awarded) / exam.totalMarks) * 100)} tone={(attempt.score ?? awarded) >= exam.passingMarks ? "success" : "danger"} size="sm" /></div>
              <p className="mt-1 text-[9px] text-fg-muted">
                {l("درجة النجاح", "Pass mark")} {exam.passingMarks} · {l("مقالي", "essay")} {essayTotal} {l("درجة", "marks")}
              </p>
            </div>
            <div className="space-y-2">
              <KeyValue label={l("الجهاز", "Device")} value={attempt.deviceLabel} />
              <KeyValue label={l("IP", "IP")} value={attempt.ip} mono />
              <KeyValue label={l("بدأ", "Started")} value={attempt.startedAt ? fmtDateTime(attempt.startedAt, locale) : "—"} />
              <KeyValue label={l("سلّم", "Submitted")} value={attempt.submittedAt ? relTime(attempt.submittedAt, locale) : "—"} />
              <KeyValue label={l("الحوادث", "Incidents")} value={`${attempt.violations} / ${exam.maxViolations}`} />
              <KeyValue label={l("آخر نبضة", "Last heartbeat")} value={relTime(attempt.lastHeartbeat, locale)} />
            </div>
          </Card>

          <Card>
            <CardHeader title={l("سجل النزاهة", "Integrity timeline")} icon="shield-alert" subtitle={l(`${events.length} حدثاً`, `${events.length} events`)} />
            <div className="space-y-1.5">
              {events.map((e) => (
                <div key={e.id} className="flex items-start gap-2 border-s border-line ps-2.5">
                  <span className={`-ms-[13px] mt-1 h-1.5 w-1.5 shrink-0 rounded-full ring-2 ring-surface ${e.severity === "CRITICAL" ? "bg-danger-500" : e.severity === "WARNING" ? "bg-warn-500" : "bg-fg-muted"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[9.5px] text-fg-soft">{e.type}</p>
                    <p className="truncate text-[9px] text-fg-muted">{l(e.detailAr ?? "", e.detailEn ?? "")}</p>
                    <p className="text-[8.5px] text-fg-muted">{relTime(e.serverTime, locale)}</p>
                  </div>
                </div>
              ))}
              {events.length === 0 && <p className="py-5 text-center text-[10.5px] text-fg-muted">{l("لا أحداث مسجّلة.", "No events recorded.")}</p>}
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-fg-muted">
              {l(
                "الحوادث معلومات للمراجعة، وليست حكماً. القرار النهائي يبقى للمراجع البشري.",
                "Events are review information, not a verdict. The final decision stays with a human reviewer.",
              )}
            </p>
          </Card>

          <Card>
            <CardHeader title={l("سياق المقرر", "Course context")} icon="book" />
            <div className="space-y-2">
              <KeyValue label={l("المقرر", "Course")} value={course ? l(course.nameAr, course.nameEn) : "—"} />
              <KeyValue label={l("الرمز", "Code")} value={exam.code} mono />
              <KeyValue label={l("السياسة", "Policy")} value={exam.policy} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
