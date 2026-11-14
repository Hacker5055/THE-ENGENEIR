import Link from "next/link";
import { Badge, Icon } from "@/components/ui";
import { MobileAppBar } from "@/components/shells/mobile-shell";
import { LiveCountdown } from "@/components/live-countdown";
import { db, findAttemptFor, findCourse, findTeacher } from "@/lib/server/store";
import { studentContext } from "@/lib/server/context";
import { fmtDate, fmtDateTime, makeL } from "@/lib/utils";

export const metadata = { title: "الاختبارات الإلكترونية" };

const POLICY_LABEL: Record<string, { ar: string; en: string; tone: "neutral" | "warning" | "danger" }> = {
  STANDARD: { ar: "سياسة قياسية", en: "Standard policy", tone: "neutral" },
  STRICT: { ar: "سياسة مشددة", en: "Strict policy", tone: "warning" },
  LOCKDOWN: { ar: "قفل كامل", en: "Lockdown", tone: "danger" },
};

export default async function ExamsPage() {
  const { student, courses, locale, unread } = await studentContext();
  const l = makeL(locale);
  const courseIds = courses.map((c) => c.id);
  const exams = db().examinations.filter((e) => courseIds.includes(e.courseId));

  const live = exams.filter((e) => e.status === "LIVE");
  const scheduled = exams.filter((e) => e.status === "SCHEDULED" || e.status === "DRAFT").filter((e) => e.status !== "DRAFT");
  const closed = exams.filter((e) => e.status === "CLOSED");

  const card = (exam: (typeof exams)[number], mode: "live" | "scheduled" | "closed") => {
    const course = findCourse(exam.courseId)!;
    const teacher = findTeacher(exam.teacherId)!;
    const attempt = findAttemptFor(exam.id, student.id);
    const policy = POLICY_LABEL[exam.policy];
    const submitted = attempt && ["SUBMITTED", "GRADING", "GRADED"].includes(attempt.status);
    const locked = attempt?.status === "LOCKED";
    const inProgress = attempt && ["IN_PROGRESS", "FLAGGED"].includes(attempt.status);

    const href =
      mode === "live" && !submitted && !locked
        ? `/student/exams/${exam.id}`
        : submitted
          ? `/student/results?exam=${exam.id}`
          : `/student/exams/${exam.id}`;

    return (
      <Link
        key={exam.id}
        href={href}
        className={
          "block rounded-xl border p-3.5 transition " +
          (mode === "live" && !submitted ? "border-danger-500/30 bg-danger-500/[0.05] hover:border-danger-500/50" : "border-line bg-surface hover:border-line-strong")
        }
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={policy.tone}>{l(policy.ar, policy.en)}</Badge>
              {mode === "live" && <Badge tone="danger" dot>{l("جارٍ الآن", "Live")}</Badge>}
              {locked && <Badge tone="danger" icon="lock">{l("مقيّد", "Locked")}</Badge>}
              {submitted && <Badge tone="success" icon="check">{l("تم التسليم", "Submitted")}</Badge>}
            </div>
            <p className="mt-1.5 text-[13px] font-semibold leading-snug text-fg">{l(exam.titleAr, exam.titleEn)}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-fg-muted">
              <span className="font-mono">{course.code}</span> · {teacher.nameAr}
            </p>
          </div>
          <Icon name="chevron-left" size={15} className="mt-1 shrink-0 text-fg-muted ltr:rotate-180" />
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-line pt-2.5 text-[10px]">
          <div>
            <p className="text-fg-muted">{l("المدة", "Duration")}</p>
            <p className="mt-0.5 font-medium text-fg">{exam.durationMin} {l("دقيقة", "min")}</p>
          </div>
          <div>
            <p className="text-fg-muted">{l("الدرجة", "Marks")}</p>
            <p className="mt-0.5 font-medium text-fg">{exam.totalMarks} · {l("نجاح", "pass")} {exam.passingMarks}</p>
          </div>
          <div>
            <p className="text-fg-muted">{l("المحاولات", "Attempts")}</p>
            <p className="mt-0.5 font-medium text-fg">{attempt?.status === "NOT_STARTED" || !attempt ? exam.allowedAttempts : 1 - (submitted ? 1 : 0)} {l("متاحة", "left")}</p>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1 text-[10px] text-fg-muted">
            <Icon name="clock" size={11} />
            {mode === "live" && attempt?.endsAt
              ? l("ينتهي خلال", "Ends in")
              : mode === "live"
                ? `${fmtDateTime(exam.endsAt, locale)}`
                : fmtDateTime(exam.startsAt, locale)}
          </p>
          {mode === "live" && attempt?.endsAt && inProgress && <LiveCountdown serverEndsAt={attempt.endsAt} compact />}
          {inProgress && <span className="text-[10px] font-semibold text-accent-400">{l("متابعة", "Resume")} ←</span>}
          {mode === "live" && !submitted && !inProgress && !locked && (
            <span className="rounded-md bg-brand px-2 py-1 text-[10px] font-semibold text-white">{l("دخول الغرفة", "Enter lobby")}</span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="pb-5">
      <MobileAppBar
        title={l("الاختبارات الإلكترونية", "Online examinations")}
        subtitle={`${exams.length} ${l("اختباراً هذا الفصل", "exams this term")}`}
        unread={unread}
        avatarName={student.nameAr}
        avatarHue={student.avatarHue}
        avatarHref="/student/profile"
      />
      <div className="space-y-4 px-4 pt-4">
        <div className="rounded-xl border border-accent-500/25 bg-accent-500/[0.06] p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-accent-300">
            <Icon name="shield-check" size={13} /> {l("بيئة اختبار آمنة", "Secure exam environment")}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-fg-muted">
            {l(
              "المؤقت يُحتسب على الخادم، وكل إجابة تُحفظ فوراً. الخروج من الشاشة يُسجَّل كحادثة تُراجع بشرياً.",
              "The timer is server-side and every answer is persisted instantly. Leaving the screen is recorded as an incident reviewed by a human.",
            )}
          </p>
        </div>

        {live.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-2 rounded-full bg-danger-500 opacity-70 animate-pulse-ring" />
                <span className="relative inline-flex size-2 rounded-full bg-danger-500" />
              </span>
              <h2 className="text-[12px] font-semibold text-fg">{l("متاح الآن", "Available now")}</h2>
            </div>
            <div className="space-y-2">{live.map((e) => card(e, "live"))}</div>
          </section>
        )}

        {scheduled.length > 0 && (
          <section>
            <h2 className="mb-2 text-[12px] font-semibold text-fg">{l("قادم", "Upcoming")}</h2>
            <div className="space-y-2">{scheduled.map((e) => card(e, "scheduled"))}</div>
          </section>
        )}

        {closed.length > 0 && (
          <section>
            <h2 className="mb-2 text-[12px] font-semibold text-fg">{l("منتهي", "Closed")}</h2>
            <div className="space-y-2">{closed.map((e) => card(e, "closed"))}</div>
          </section>
        )}

        <div className="rounded-xl border border-line bg-surface-2/50 p-3">
          <p className="text-[10.5px] font-medium text-fg-soft">{l("قبل الدخول إلى الاختبار", "Before you enter an exam")}</p>
          <ul className="mt-1.5 space-y-1">
            {[
              l("تحقق من استقرار الشبكة وشحن الجهاز.", "Check network stability and battery."),
              l("أغلق التطبيقات الأخرى — الخروج يُسجَّل.", "Close other apps — leaving is recorded."),
              l("لن تتمكن من إيقاف المؤقت بعد البدء.", "You cannot pause the timer once started."),
            ].map((t) => (
              <li key={t} className="flex gap-1.5 text-[10px] text-fg-muted">
                <Icon name="check" size={10} className="mt-0.5 shrink-0 text-success-500" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
