import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Alert, Badge, Icon } from "@/components/ui";
import { MobileAppBar } from "@/components/shells/mobile-shell";
import { DeviceCheck } from "@/components/student/device-check";
import { LiveCountdown } from "@/components/live-countdown";
import { resumeExamAction, startExamAction } from "@/app/actions/exam";
import { db, findAttemptFor, findCourse, findExam, findTeacher } from "@/lib/server/store";
import { studentContext } from "@/lib/server/context";
import { fmtDateTime, makeL } from "@/lib/utils";

export const metadata = { title: "غرفة الاختبار" };

const ERRORS: Record<string, { ar: string; en: string }> = {
  rules: { ar: "يجب قبول قواعد الاختبار قبل البدء.", en: "You must accept the exam rules before starting." },
  not_live: { ar: "الاختبار غير متاح للبدء الآن.", en: "The exam is not open for starting." },
  locked: { ar: "المحاولة مقيّدة وتتطلب قرار المراقب.", en: "The attempt is locked and requires a supervisor decision." },
  already_submitted: { ar: "تم تسليم هذه المحاولة مسبقاً.", en: "This attempt was already submitted." },
  attempts_exhausted: { ar: "استنفدت عدد المحاولات المسموح بها.", en: "You have used all allowed attempts." },
  closed: { ar: "انتهى وقت الاختبار.", en: "The exam window has closed." },
};

export default async function ExamLobbyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { student, locale, unread } = await studentContext();
  const l = makeL(locale);
  const { id } = await params;
  const { error } = await searchParams;
  const exam = findExam(id);
  if (!exam) notFound();

  const course = findCourse(exam.courseId)!;
  const teacher = findTeacher(exam.teacherId)!;
  const attempt = findAttemptFor(exam.id, student.id);
  const device = db().devices.find((d) => d.id === attempt?.deviceId && d.studentId === student.id) ?? db().devices.find((d) => d.studentId === student.id);
  const questions = exam.questionIds.length;

  if (!attempt) {
    return (
      <div className="pb-6">
        <MobileAppBar back={{ href: "/student/exams" }} title={l("غرفة الاختبار", "Exam lobby")} subtitle={course.code} />
        <div className="px-4 pt-6">
          <Alert tone="warning" title={l("لا توجد محاولة مخصصة لك", "No attempt assigned to you")}>
            {l("تواصل مع المعلم أو الإدارة لتخصيص محاولة في هذا الاختبار.", "Contact your teacher or administration to be assigned an attempt.")}
          </Alert>
        </div>
      </div>
    );
  }

  if (["SUBMITTED", "GRADING", "GRADED"].includes(attempt.status)) {
    redirect(`/student/results?exam=${exam.id}`);
  }

  const isInProgress = attempt.status === "IN_PROGRESS" || attempt.status === "FLAGGED";
  const isLocked = attempt.status === "LOCKED";

  return (
    <div className="pb-6">
      <MobileAppBar back={{ href: "/student/exams" }} title={l("غرفة الاختبار", "Exam lobby")} subtitle={`${course.code} · ${exam.code}`} unread={unread} />

      <div className="space-y-4 px-4 pt-4">
        {error && ERRORS[error] && <Alert tone="danger" title={l(ERRORS[error].ar, ERRORS[error].en)} icon="alert-circle" />}

        {/* exam header */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(140deg,#192B45_0%,#101B2D_100%)] p-4 text-white">
          <div className="pointer-events-none absolute inset-0 opacity-[0.14] app-grid-bg" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <Badge tone={exam.policy === "LOCKDOWN" ? "danger" : exam.policy === "STRICT" ? "warning" : "neutral"}>
                {exam.policy === "LOCKDOWN" ? l("قفل كامل", "Lockdown") : exam.policy === "STRICT" ? l("سياسة مشددة", "Strict") : l("سياسة قياسية", "Standard")}
              </Badge>
              <Badge tone="accent">{l("محاولة واحدة", "1 attempt")}</Badge>
            </div>
            <h1 className="mt-2 text-[16px] font-semibold leading-snug">{l(exam.titleAr, exam.titleEn)}</h1>
            <p className="mt-1 text-[11px] text-white/55">
              {course.code} · {l(course.nameAr, course.nameEn)}
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2 border-t border-white/10 pt-3 text-center">
              {[
                [String(questions), l("أسئلة", "questions")],
                [`${exam.durationMin}`, l("دقيقة", "min")],
                [`${exam.totalMarks}`, l("درجة", "marks")],
                [`${exam.passingMarks}`, l("للنجاح", "to pass")],
              ].map(([v, k]) => (
                <div key={k}>
                  <p className="tnum text-[16px] font-semibold">{v}</p>
                  <p className="text-[9px] text-white/50">{k}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {isLocked && (
          <Alert tone="danger" title={l("المحاولة مقيّدة", "Attempt locked")} icon="lock">
            {l(
              `تم تجميد الجلسة بعد ${attempt.violations} حادثة. إجاباتك المحفوظة لم تُفقد. يمكن للمراقب استئناف المحاولة أو منح وقت إضافي بعد المراجعة.`,
              `The session was frozen after ${attempt.violations} incidents. Your saved answers are preserved. A supervisor can resume the attempt or grant extra time after review.`,
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href="/student/complaints/new?category=EXAM_INCIDENT" className="text-[11px] font-medium text-accent-400 underline">
                {l("تقديم طلب مراجعة", "Submit a review request")}
              </Link>
            </div>
          </Alert>
        )}

        {isInProgress && (
          <section className="rounded-xl border border-accent-500/30 bg-accent-500/[0.07] p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-fg">{l("لديك محاولة جارية", "You have an attempt in progress")}</p>
              {attempt.endsAt && <LiveCountdown serverEndsAt={attempt.endsAt} compact showIcon />}
            </div>
            <p className="mt-1 text-[10.5px] text-fg-muted">
              {l("المؤقت يعمل على الخادم. العودة للاختبار تستأنف من حيث توقفت.", "The timer runs server-side. Resuming continues where you left off.")}
            </p>
            <form action={resumeExamAction} className="mt-2.5">
              <input type="hidden" name="attemptId" value={attempt.id} />
              <button type="submit" className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-brand text-[12px] font-semibold text-white">
                <Icon name="play" size={13} /> {l("استئناف الاختبار", "Resume exam")}
              </button>
            </form>
          </section>
        )}

        {/* meta */}
        <section className="rounded-xl border border-line bg-surface p-3.5">
          <p className="mb-2 text-[11.5px] font-semibold text-fg">{l("تفاصيل الجلسة", "Session details")}</p>
          <dl className="space-y-1.5">
            {[
              [l("المعلم", "Teacher"), teacher.nameAr],
              [l("البداية", "Starts"), fmtDateTime(exam.startsAt, locale)],
              [l("النهاية", "Ends"), fmtDateTime(exam.endsAt, locale)],
              [l("الجهاز", "Device"), attempt.deviceLabel],
              [l("الأسئلة", "Questions"), `${questions} ${l("سؤالاً", "questions")}`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 text-[10.5px]">
                <dt className="text-fg-muted">{k}</dt>
                <dd className="text-end font-medium text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <DeviceCheck
          serverNow={Date.now()}
          deviceLabel={attempt.deviceLabel}
          managed={device?.managed ?? false}
          geoRequired={exam.geoRequired}
        />

        {/* rules */}
        <section className="rounded-xl border border-line bg-surface p-3.5">
          <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-fg">
            <Icon name="list-checks" size={13} className="text-accent-400" /> {l("قواعد الاختبار", "Exam rules")}
          </p>
          <ol className="space-y-1.5">
            {exam.instructionsAr.map((rule, i) => (
              <li key={i} className="flex gap-2 text-[10.5px] leading-relaxed text-fg-muted">
                <span className="tnum grid size-4 shrink-0 place-items-center rounded-full bg-surface-3 text-[8.5px] font-semibold text-fg-soft">{i + 1}</span>
                {rule}
              </li>
            ))}
          </ol>
          <div className="mt-2.5 rounded-lg border border-line bg-surface-2/60 p-2.5 text-[9.5px] leading-relaxed text-fg-muted">
            {l(
              "الحد الأقصى للحوادث قبل التجميد: ",
              "Incident threshold before freezing: ",
            )}
            <span className="font-semibold text-fg-soft">{exam.maxViolations}</span>
            {" · "}
            {l("لا يُحتسب انقطاع الشبكة مخالفة تلقائياً.", "A network drop is never counted automatically as a violation.")}
          </div>
        </section>

        {!isLocked && !isInProgress && (
          <form action={startExamAction} className="rounded-xl border border-line bg-surface p-3.5">
            <input type="hidden" name="examId" value={exam.id} />
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" name="accept" required className="mt-0.5 size-4 accent-[#2864D9]" />
              <span className="text-[10.5px] leading-relaxed text-fg-soft">
                {l(
                  "أقرّ بأنني قرأت القواعد وأوافق عليها، وأعلم أن المؤقت يبدأ فوراً وأن الخروج من الشاشة يُسجَّل كحادثة.",
                  "I confirm I have read and accept the rules, that the timer starts immediately, and that leaving the screen is recorded as an incident.",
                )}
                <span className="text-danger-500"> *</span>
              </span>
            </label>
            <button
              type="submit"
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[13px] font-semibold text-white shadow-glow transition hover:bg-brand-600 active:scale-[.99]"
            >
              <Icon name="play" size={15} />
              {l("بدء الاختبار", "Start examination")}
            </button>
            <p className="mt-2 flex items-center justify-center gap-1 text-[9.5px] text-fg-muted">
              <Icon name="lock" size={10} /> {l("بعد البدء لا يمكن إيقاف المؤقت", "The timer cannot be paused after starting")}
            </p>
          </form>
        )}

        <p className="text-center text-[9.5px] leading-relaxed text-fg-muted">
          {l(
            "لا يتم الوصول إلى الكاميرا أو الميكروفون أو محتوى التطبيقات الأخرى في أي مرحلة.",
            "The camera, microphone and other apps' content are never accessed at any stage.",
          )}
        </p>
      </div>
    </div>
  );
}
