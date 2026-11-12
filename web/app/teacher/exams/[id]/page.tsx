import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardHeader, Icon, KeyValue, Progress, StatusBadge, TableWrap, Td, Th } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/shells/app-shell";
import { db, findCourse, findExam } from "@/lib/server/store";
import { teacherContext } from "@/lib/server/context";
import { publishExamResults } from "@/app/actions/teacher";
import { fmtDateTime, makeL, relTime } from "@/lib/utils";

export default async function TeacherExamDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { teacher, locale } = await teacherContext();
  const exam = findExam(id);
  if (!exam || exam.teacherId !== teacher.id) notFound();
  const l = makeL(locale);

  const course = findCourse(exam.courseId);
  const attempts = db().attempts.filter((a) => a.examinationId === exam.id);
  const graded = attempts.filter((a) => a.score !== undefined);
  const avg = graded.length ? Math.round((graded.reduce((a, x) => a + (x.score ?? 0), 0) / graded.length / exam.totalMarks) * 100) : 0;
  const questions = exam.questionIds.map((qid) => db().questions.find((q) => q.id === qid)).filter(Boolean);
  const events = db().examEvents.filter((e) => e.examinationId === exam.id).sort((a, b) => b.serverTime - a.serverTime).slice(0, 6);

  const policyLabel = exam.policy === "LOCKDOWN" ? l("مقيّد", "Lockdown") : exam.policy === "STRICT" ? l("صارم", "Strict") : l("قياسي", "Standard");

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l(exam.titleAr, exam.titleEn)}
        subtitle={`${course?.code} · ${l("نافذة", "Window")} ${fmtDateTime(exam.startsAt, locale)} · ${exam.durationMin} ${l("دقيقة", "min")}`}
        breadcrumb={[{ label: l("الاختبارات", "Examinations"), href: "/teacher/exams" }, { label: exam.code }]}
        badge={<StatusBadge status={exam.status} />}
        actions={
          <>
            <Link href={`/teacher/grading?exam=${exam.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 text-[12.5px] font-semibold text-fg hover:bg-surface-2">
              <Icon name="edit" size={14} /> {l("التصحيح", "Grade")}
            </Link>
            {!exam.resultPublished ? (
              <form action={publishExamResults}>
                <input type="hidden" name="examId" value={exam.id} />
                <button
                  type="submit"
                  disabled={graded.length === 0}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-success-500 px-3.5 text-[12.5px] font-semibold text-white transition hover:bg-success-500/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon name="send" size={14} /> {l("نشر النتائج", "Publish results")}
                </button>
              </form>
            ) : (
              <Badge tone="success" dot>{l("النتائج منشورة", "Results published")}</Badge>
            )}
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("المحاولات", "Attempts")} value={attempts.length} icon="users" tone="brand" hint={`${attempts.filter((a) => a.status === "IN_PROGRESS").length} ${l("جارية", "in progress")}`} />
        <StatCard label={l("متوسط النتيجة", "Average score")} value={`${avg}%`} icon="percent" tone="accent" />
        <StatCard label={l("بانتظار التصحيح", "Awaiting grading")} value={attempts.filter((a) => a.status === "SUBMITTED" || a.status === "GRADING").length} icon="edit" tone="warning" />
        <StatCard label={l("حوادث مسجلة", "Recorded incidents")} value={db().examEvents.filter((e) => e.examinationId === exam.id).length} icon="shield-alert" tone="danger" />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title={l("محاولات الطلاب", "Student attempts")} subtitle={l("الدرجات والحوادث لكل محاولة", "Scores and incidents per attempt")} icon="users" />
            <TableWrap>
              <thead>
                <tr>
                  <Th>{l("الطالب", "Student")}</Th>
                  <Th>{l("الجهاز", "Device")}</Th>
                  <Th align="center">{l("الحوادث", "Incidents")}</Th>
                  <Th align="center">{l("الدرجة", "Score")}</Th>
                  <Th align="end">{l("الحالة", "Status")}</Th>
                  <Th align="end" />
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => {
                  const st = db().students.find((s) => s.id === a.studentId);
                  return (
                    <tr key={a.id} className="transition hover:bg-surface-2/60">
                      <Td>
                        <p className="text-[11.5px] font-medium text-fg">{l(st?.nameAr ?? "", st?.nameEn ?? "")}</p>
                        <p className="font-mono text-[9.5px] text-fg-muted">{st?.studentNumber}</p>
                      </Td>
                      <Td>
                        <p className="text-[10.5px] text-fg-soft">{a.deviceLabel}</p>
                        <p className="font-mono text-[9px] text-fg-muted">{a.ip}</p>
                      </Td>
                      <Td align="center">
                        <span className={`tnum text-[11.5px] font-semibold ${a.violations >= exam.maxViolations ? "text-danger-500" : a.violations > 0 ? "text-warn-500" : "text-fg-muted"}`}>
                          {a.violations}/{exam.maxViolations}
                        </span>
                      </Td>
                      <Td align="center"><span className="tnum text-[11.5px] font-semibold text-fg">{a.score ?? "—"}</span><span className="text-[9.5px] text-fg-muted">/{exam.totalMarks}</span></Td>
                      <Td align="end"><StatusBadge status={a.status} /></Td>
                      <Td align="end">
                        <Link href={`/teacher/grading/${a.id}`} className="text-[11px] font-semibold text-brand-500 hover:underline">
                          {l("مراجعة", "Review")}
                        </Link>
                      </Td>
                    </tr>
                  );
                })}
                {attempts.length === 0 && (
                  <tr><Td colSpan={6} className="py-8 text-center text-[11.5px] text-fg-muted">{l("لا محاولات بعد.", "No attempts yet.")}</Td></tr>
                )}
              </tbody>
            </TableWrap>
            <p className="mt-2 text-[9.5px] text-fg-muted">
              {l("التصفير أو التجميد لا يمسح الإجابات — تُحفظ نسخة كاملة للمراجعة.", "A freeze or reset never deletes answers — a full snapshot is kept for review.")}
            </p>
          </Card>

          <Card>
            <CardHeader title={l("أسئلة الاختبار", "Examination items")} subtitle={`${questions.length} ${l("سؤالاً", "items")} · ${exam.totalMarks} ${l("درجة", "marks")}`} icon="layers" />
            <div className="space-y-2">
              {questions.map((q, i) => {
                if (!q) return null;
                return (
                  <div key={q.id} className="rounded-lg border border-line bg-surface-2/50 p-2.5">
                    <div className="flex items-start gap-2">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-brand-500/15 font-mono text-[9.5px] font-semibold text-brand-400">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11.5px] leading-snug text-fg">{l(q.promptAr, q.promptEn)}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] text-fg-muted">
                          <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono">{q.type}</span>
                          <span className={q.difficulty === "HARD" ? "text-danger-500" : q.difficulty === "EASY" ? "text-success-500" : "text-warn-500"}>{q.difficulty}</span>
                          <span>· {q.marks} {l("درجة", "marks")}</span>
                          <span>· {l("استُخدم", "used")} {q.usageCount}×</span>
                        </div>
                        {q.options.length > 0 && (
                          <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                            {q.options.map((o) => (
                              <li key={o.id} className={`flex items-center gap-1 text-[10px] ${q.correct.includes(o.id) ? "font-medium text-success-500" : "text-fg-muted"}`}>
                                <Icon name={q.correct.includes(o.id) ? "check-circle" : "minus"} size={10} /> {l(o.textAr, o.textEn)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={l("إعدادات الاختبار", "Examination settings")} icon="settings" />
            <div className="space-y-2">
              <KeyValue label={l("الرمز", "Code")} value={exam.code} mono />
              <KeyValue label={l("السياسة", "Policy")} value={policyLabel} />
              <KeyValue label={l("حد الحوادث", "Violation cap")} value={`${exam.maxViolations}`} />
              <KeyValue label={l("تجميد آلي", "Auto freeze")} value={exam.lockOnViolation ? l("مفعّل", "On") : l("معطّل", "Off")} />
              <KeyValue label={l("خلط الأسئلة", "Shuffle items")} value={exam.randomizeQuestions ? l("نعم", "Yes") : l("لا", "No")} />
              <KeyValue label={l("خلط الاختيارات", "Shuffle options")} value={exam.randomizeOptions ? l("نعم", "Yes") : l("لا", "No")} />
              <KeyValue label={l("الموقع مطلوب", "Geofence")} value={exam.geoRequired ? l("نعم", "Yes") : l("لا", "No")} />
              <KeyValue label={l("المحاولات", "Attempts")} value={exam.allowedAttempts} />
              <KeyValue label={l("تصحيح آلي", "Auto-grade")} value={exam.autoGrade ? l("مفعّل", "On") : l("يدوي", "Manual")} />
            </div>
            <div className="mt-3">
              <p className="mb-1 flex items-center justify-between text-[10px] text-fg-muted"><span>{l("تقدّم التصحيح", "Grading progress")}</span><span className="tnum">{graded.length}/{attempts.length}</span></p>
              <Progress value={attempts.length ? Math.round((graded.length / attempts.length) * 100) : 0} size="sm" tone="accent" />
            </div>
          </Card>

          <Card>
            <CardHeader title={l("سجل الحوادث", "Incident feed")} icon="shield-alert" subtitle={l("أحدث 6 حوادث", "Latest 6 events")} />
            <div className="space-y-1.5">
              {events.map((e) => (
                <div key={e.id} className="flex items-start gap-2 rounded-lg bg-surface-2/60 px-2 py-1.5">
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${e.severity === "CRITICAL" ? "bg-danger-500" : e.severity === "WARNING" ? "bg-warn-500" : "bg-fg-muted"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[9.5px] text-fg-soft">{e.type}</p>
                    <p className="text-[9px] text-fg-muted">
                      {db().students.find((s) => s.id === e.studentId)?.nameAr ?? e.studentId} · {relTime(e.serverTime, locale)}
                    </p>
                  </div>
                </div>
              ))}
              {events.length === 0 && <p className="py-4 text-center text-[10.5px] text-fg-muted">{l("لا حوادث — نظيف.", "No incidents — clean.")}</p>}
            </div>
            <Link href={`/admin/exam-control?exam=${exam.id}`} className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-[10.5px] font-semibold text-fg-soft hover:text-fg">
              <Icon name="shield-alert" size={12} /> {l("مركز المراقبة الكامل", "Full control center")}
            </Link>
          </Card>

          <Card>
            <CardHeader title={l("سياسة النزاهة المعروضة", "Disclosed integrity policy")} icon="info" />
            <ul className="space-y-1.5">
              {exam.instructionsAr.map((x) => (
                <li key={x} className="flex gap-1.5 text-[10px] leading-relaxed text-fg-muted">
                  <Icon name="check" size={11} className="mt-0.5 shrink-0 text-success-500" /> {x}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
