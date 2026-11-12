import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge, Card, CardHeader, Field, Icon, KeyValue, Input, Progress, Select, StatusBadge, Textarea } from "@/components/ui";
import { PageHeader } from "@/components/shells/app-shell";
import { db, findAttempt, findExam, findStudent } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { injectExamEvent, supervisorDecision } from "@/app/actions/admin";
import { fmtDateTime, makeL, relTime } from "@/lib/utils";

const SEV_TONE = { CRITICAL: "danger", WARNING: "warning", INFO: "neutral" } as const;

export default async function AttemptReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { attemptId } = await params;
  const sp = await searchParams;
  const { locale, user } = await adminContext();
  const l = makeL(locale);
  const attempt = findAttempt(attemptId);
  if (!attempt) notFound();
  const exam = findExam(attempt.examinationId);
  if (!exam) notFound();
  const student = findStudent(attempt.studentId);
  const events = db().examEvents.filter((e) => e.attemptId === attempt.id).sort((a, b) => b.serverTime - a.serverTime);
  const remaining = Math.max(0, (attempt.endsAt ?? 0) - Date.now());
  const questions = attempt.questionOrder.map((qid) => db().questions.find((q) => q.id === qid));

  const errorText =
    sp.error === "reason"
      ? l("السبب إلزامي (4 أحرف على الأقل) لأي قرار.", "A reason (4+ characters) is mandatory for any decision.")
      : sp.error === "detail"
        ? l("اكتب ملاحظة أطول قبل الحفظ.", "Write a longer note before saving.")
        : sp.error
          ? l("تعذّر تنفيذ القرار — تحقّق من المدخلات والصلاحية.", "The decision could not be applied — check inputs and permissions.")
          : null;

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("مراجعة محاولة", "Attempt review")}
        subtitle={`${l(student?.nameAr ?? "", student?.nameEn ?? "")} · ${student?.studentNumber} · ${l(exam.titleAr, exam.titleEn)}`}
        breadcrumb={[
          { label: l("مركز المراقبة", "Control center"), href: "/admin/exam-control" },
          { label: attempt.id },
        ]}
        badge={<StatusBadge status={attempt.status} />}
        actions={
          <>
            <Link href={`/teacher/grading/${attempt.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 text-[12.5px] font-semibold text-fg hover:bg-surface-2">
              <Icon name="edit" size={14} /> {l("التصحيح", "Grading")}
            </Link>
            <Link href="/admin/exam-control" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 text-[12.5px] font-semibold text-fg hover:bg-surface-2">
              <Icon name="arrow-right" size={14} className="rtl:rotate-180" /> {l("رجوع", "Back")}
            </Link>
          </>
        }
      />

      {errorText && (
        <div className="rounded-lg border border-danger-500/30 bg-danger-500/[0.08] px-4 py-2.5 text-[12px] text-danger-500">
          <Icon name="alert-circle" size={14} className="me-1 inline" /> {errorText}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title={l("الخط الزمني للنزاهة", "Integrity timeline")}
              subtitle={l(`${events.length} حدثاً · كل حدث موقّع بوقت الخادم`, `${events.length} events · each stamped by the server clock`)}
              icon="shield-alert"
            />
            <div className="space-y-2.5">
              {events.map((e) => (
                <div key={e.id} className="relative ps-4">
                  <span className={`absolute start-0 top-1.5 h-2 w-2 rounded-full ring-2 ring-surface ${e.severity === "CRITICAL" ? "bg-danger-500" : e.severity === "WARNING" ? "bg-warn-500" : "bg-brand-400"}`} />
                  <span className="absolute start-[3.5px] top-3.5 h-[calc(100%-8px)] w-px bg-line" />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={SEV_TONE[e.severity]}>{e.severity}</Badge>
                    <span className="font-mono text-[10px] text-fg-soft">{e.type}</span>
                    <span className="text-[9px] text-fg-muted">{relTime(e.serverTime, locale)}</span>
                    {e.clientTime && <span className="font-mono text-[8.5px] text-fg-muted">client Δ {Math.round((e.clientTime - e.serverTime) / 1000)}s</span>}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-fg-soft">{l(e.detailAr, e.detailEn)}</p>
                  <p className="mt-0.5 text-[9px] text-fg-muted">{e.deviceLabel}{e.reason ? ` · ${l("سبب:", "reason:")} ${e.reason}` : ""}</p>
                </div>
              ))}
              {events.length === 0 && <p className="py-6 text-center text-[11.5px] text-fg-muted">{l("لا أحداث — محاولة نظيفة.", "No events — clean attempt.")}</p>}
            </div>
          </Card>

          <Card>
            <CardHeader title={l("الإجابات المحفوظة", "Saved answers")} subtitle={l("محتوى الإجابات محفوظ على الخادم ولا يتأثر بالتجميد", "Answers persist server-side and survive a freeze")} icon="clipboard" />
            <div className="space-y-1.5">
              {questions.map((q, i) => {
                if (!q) return null;
                const ans = attempt.answers.find((a) => a.questionId === q.id);
                const answered = !!ans && (ans.value.length > 0 || !!ans.textValue);
                return (
                  <div key={q.id} className="flex items-start gap-2 rounded-lg border border-line bg-surface-2/50 px-2.5 py-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-surface-3 font-mono text-[9px] text-fg-muted">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] text-fg">{l(q.promptAr, q.promptEn)}</p>
                      <p className="text-[9px] text-fg-muted">
                        {q.type} · {q.marks} {l("درجة", "marks")}
                        {ans ? ` · ${l("محفوظة", "saved")} ${relTime(ans.savedAt, locale)} · rev ${ans.revision}` : ""}
                      </p>
                      {q.type === "ESSAY" && ans?.textValue && (
                        <p className="mt-1 line-clamp-2 rounded bg-surface px-2 py-1 text-[10px] text-fg-muted">{ans.textValue}</p>
                      )}
                    </div>
                    <Badge tone={answered ? "success" : "neutral"}>{answered ? l("مُجابة", "Answered") : l("فارغة", "Blank")}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title={l("ملاحظة مراقبة", "Supervisor note")} subtitle={l("تُضاف إلى الخط الزمني بنوع وسبب", "Appended to the timeline with type and detail")} icon="message" />
            <form action={injectExamEvent} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="attemptId" value={attempt.id} />
              <Field label={l("النوع", "Type")} className="w-44">
                <Select name="type" defaultValue="SUPERVISOR_DECISION">
                  <option value="SUPERVISOR_DECISION">SUPERVISOR_DECISION</option>
                  <option value="DEVICE_MISMATCH">DEVICE_MISMATCH</option>
                  <option value="NETWORK_LOST">NETWORK_LOST</option>
                  <option value="SESSION_FROZEN">SESSION_FROZEN</option>
                </Select>
              </Field>
              <Field label={l("التفصيل", "Detail")} className="min-w-[220px] flex-1">
                <Input name="detail" placeholder={l("ما الذي رصدته وكيف تحققت منه؟", "What did you observe and how did you verify it?")} required minLength={4} />
              </Field>
              <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-[11.5px] font-semibold text-fg-soft hover:text-fg">
                <Icon name="plus" size={13} /> {l("إضافة", "Add")}
              </button>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={l("قرار المراقب", "Supervisor decision")} subtitle={l(`المنفّذ: ${user.nameAr}`, `Actor: ${user.nameEn}`)} icon="key" />
            <form action={supervisorDecision} className="space-y-2.5">
              <input type="hidden" name="attemptId" value={attempt.id} />
              <div className="space-y-1.5">
                {[
                  { v: "RESUME", t: l("استئناف المحاولة + وقت إضافي", "Resume with extra time"), d: l("لفتح تجميد أو تعليق مع منح وقت", "Unfreeze and grant time") },
                  { v: "ADD_TIME", t: l("منح وقت إضافي فقط", "Grant extra time only"), d: l("دون تغيير الحالة", "Without changing status") },
                  { v: "APPROVE", t: l("اعتماد التسليم", "Accept submission"), d: l("تصحيح واعتماد رغم الحوادث", "Grade and accept despite incidents") },
                  { v: "CLEAR", t: l("رفع التعليق", "Clear the flag"), d: l("مراجعة بشرية أثبتتُ سلامة المحاولة", "Review found no misconduct") },
                  { v: "REQUEST_STATEMENT", t: l("طلب إفادة من الطالب", "Request a statement"), d: l("إخطار الطالب قبل القرار", "Notify before deciding") },
                  { v: "VOID", t: l("إلغاء المحاولة", "Void the attempt"), d: l("قرار نهائي موثّق بالسبب", "Final, reason-documented") },
                ].map((d) => (
                  <label key={d.v} className="flex cursor-pointer items-start gap-2 rounded-lg border border-line bg-surface-2/50 px-2.5 py-2 transition has-[:checked]:border-brand-500/50 has-[:checked]:bg-brand-500/[0.07]">
                    <input type="radio" name="decision" value={d.v} required defaultChecked={d.v === "APPROVE"} className="mt-0.5 h-3.5 w-3.5 accent-[#2864D9]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-medium text-fg">{d.t}</span>
                      <span className="block text-[9px] text-fg-muted">{d.d}</span>
                    </span>
                    {d.v === "VOID" && <Icon name="alert-circle" size={12} className="mt-0.5 shrink-0 text-danger-500" />}
                  </label>
                ))}
              </div>
              <Field label={l("الدقائق", "Minutes")} hint={l("تُستخدم مع الاستئناف أو منح الوقت", "Used with resume or extra time")}>
                <Input name="minutes" type="number" min={1} max={60} defaultValue={5} className="h-8" />
              </Field>
              <Field label={l("السبب (إلزامي)", "Reason (mandatory)")}>
                <Textarea name="reason" rows={2} required minLength={4} placeholder={l("مثال: تحقق من سجل الشبكة — انقطاع اتصال لا نية غش.", "e.g. network log shows an outage, not misconduct.")} />
              </Field>
              <button type="submit" className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 text-[12.5px] font-semibold text-white transition hover:bg-brand-600">
                <Icon name="check" size={14} /> {l("تنفيذ القرار", "Apply decision")}
              </button>
              <p className="text-[9px] leading-relaxed text-fg-muted">
                {l(
                  "كل قرار يُسجَّل باسمك وبالسبب، ويُخطر الطالب، ويظهر في سجل التدقيق. لا يمكن حذف القرار — فقط قرار جديد يشرح التغيير.",
                  "Every decision records your name and reason, notifies the student, and appears in the audit log. Decisions cannot be deleted — only superseded by a new documented decision.",
                )}
              </p>
            </form>
          </Card>

          <Card>
            <CardHeader title={l("بيانات المحاولة", "Attempt facts")} icon="clock" />
            <div className="mb-2.5 flex items-center gap-2.5 rounded-lg bg-surface-2 px-2.5 py-2">
              <Avatar name={student?.nameAr ?? "?"} size={34} />
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-semibold text-fg">{l(student?.nameAr ?? "", student?.nameEn ?? "")}</p>
                <p className="font-mono text-[9px] text-fg-muted">{student?.studentNumber} · GPA {student?.gpa.toFixed(2)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <KeyValue label={l("الجهاز", "Device")} value={attempt.deviceLabel} />
              <KeyValue label={l("المعرّف", "Device id")} value={attempt.deviceId} mono />
              <KeyValue label={l("IP", "IP")} value={attempt.ip} mono />
              <KeyValue label={l("بدأ", "Started")} value={attempt.startedAt ? fmtDateTime(attempt.startedAt, locale) : "—"} />
              <KeyValue label={l("ينتهي", "Ends")} value={attempt.endsAt ? `${Math.floor(remaining / 60000)} ${l("دقيقة متبقية", "min left")}` : "—"} />
              <KeyValue label={l("وقت إضافي", "Extra time")} value={`${attempt.extraTimeMin ?? 0} ${l("دقيقة", "min")}`} />
              <KeyValue label={l("الحوادث", "Violations")} value={`${attempt.violations} / ${exam.maxViolations}`} />
              <KeyValue label={l("الإجابات", "Answers")} value={`${attempt.answers.length} / ${attempt.questionOrder.length}`} />
              <KeyValue label={l("الدرجة", "Score")} value={attempt.score !== undefined ? `${attempt.score} / ${exam.totalMarks}` : "—"} />
            </div>
            <div className="mt-2.5">
              <p className="mb-1 flex items-center justify-between text-[9.5px] text-fg-muted">
                <span>{l("تقدم المحاولة", "Attempt progress")}</span>
                <span className="tnum">{Math.round((attempt.answers.length / Math.max(1, attempt.questionOrder.length)) * 100)}%</span>
              </p>
              <Progress value={(attempt.answers.length / Math.max(1, attempt.questionOrder.length)) * 100} size="sm" tone="brand" />
            </div>
          </Card>

          <div className="rounded-xl border border-line bg-surface-2/50 p-3">
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-fg-soft">
              <Icon name="info" size={12} className="text-accent-400" /> {l("حدود ما يراه النظام", "What the system can see")}
            </p>
            <p className="mt-1 text-[9.5px] leading-relaxed text-fg-muted">
              {l(
                "لا يوجد لقطات شاشة، لا كاميرا، لا ميكروفون، ولا تسجيل شاشة. الأحداث تعتمد على حالة التطبيق والجهاز وتوقيع الوقت من الخادم.",
                "No screenshots, camera, microphone or screen recording. Events rely on app and device state plus server time signatures.",
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
