"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Icon, Modal, Progress, Spinner, Textarea } from "@/components/ui";
import { useOnline, usePrefs, useToast } from "@/components/providers";
import { LogoMark } from "@/components/brand/logo";
import { cx, fmtCountdown } from "@/lib/utils";
import type { Locale } from "@/lib/types";

interface RunnerQuestion {
  id: string;
  type: string;
  promptAr: string;
  promptEn: string;
  marks: number;
  imageUrl?: string;
  options: { id: string; textAr: string; textEn: string }[];
}

interface RunnerAnswer {
  questionId: string;
  value: string[];
  textValue: string;
  flagged: boolean;
  savedAt: number;
}

type SaveState = "idle" | "dirty" | "saving" | "saved" | "offline" | "error";

const TYPE_LABEL: Record<string, { ar: string; en: string }> = {
  MCQ: { ar: "اختيار من متعدد", en: "Multiple choice" },
  TRUE_FALSE: { ar: "صح / خطأ", en: "True / false" },
  ESSAY: { ar: "سؤال مقالي", en: "Essay" },
  FILL_BLANK: { ar: "أكمل الفراغ", en: "Fill in the blank" },
  MATCHING: { ar: "مطابقة", en: "Matching" },
  IMAGE: { ar: "سؤال بصري", en: "Image question" },
  FILE: { ar: "رفع ملف", en: "File answer" },
};

export function ExamRunner({
  attemptId,
  exam,
  questions,
  initialAnswers,
  serverNow,
  endsAt,
  status: initialStatus,
  violations: initialViolations,
  deviceLabel,
  studentName,
  locale,
}: {
  attemptId: string;
  exam: { titleAr: string; titleEn: string; code: string; policy: string; totalMarks: number; passingMarks: number; durationMin: number; maxViolations: number };
  questions: RunnerQuestion[];
  initialAnswers: RunnerAnswer[];
  serverNow: number;
  endsAt: number;
  status: string;
  violations: number;
  deviceLabel: string;
  studentName: string;
  locale: Locale;
}) {
  const l = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const online = useOnline();
  const { toast } = useToast();

  const [answers, setAnswers] = useState<Record<string, RunnerAnswer>>(() => {
    const map: Record<string, RunnerAnswer> = {};
    for (const a of initialAnswers) map[a.questionId] = { ...a };
    return map;
  });
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [index, setIndex] = useState(0);
  const [serverClockOffset] = useState(serverNow - Date.now());
  const [status, setStatus] = useState(initialStatus);
  const [violations, setViolations] = useState(initialViolations);
  const [remaining, setRemaining] = useState(Math.max(0, endsAt - Date.now()));
  const [navOpen, setNavOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ score: number | null; pendingManual: number } | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [focusStrikes, setFocusStrikes] = useState(0);
  const pendingRef = useRef<Record<string, number>>({});
  const blurTimer = useRef<number | null>(null);
  const submittedRef = useRef(false);

  const current = questions[index];
  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    return !!a && (a.value.length > 0 || a.textValue.trim().length > 0);
  }).length;
  const flaggedCount = Object.values(answers).filter((a) => a.flagged).length;
  const locked = status === "LOCKED" || status === "CANCELLED";

  /* --------------------------- server clock --------------------------- */
  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, endsAt - (Date.now() + serverClockOffset));
      setRemaining(left);
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [endsAt, serverClockOffset]);

  /* --------------------------- resync & heartbeat ---------------------- */
  const resync = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/exam/attempts/${attemptId}/state`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data.status);
      setViolations(data.violations);
      if (data.status === "LOCKED") setSubmitOpen(false);
      if (data.status === "SUBMITTED" || data.status === "GRADED") {
        router.replace(`/student/results?exam=${data.examinationId}`);
      }
    } catch {
      /* offline — retried on the next tick */
    }
  }, [attemptId, router]);

  useEffect(() => {
    const t = setInterval(resync, 20_000);
    return () => clearInterval(t);
  }, [resync]);

  /* ------------------------------ saving ------------------------------- */
  const persist = useCallback(
    async (questionId: string, payload: { value: string[]; textValue: string; flagged: boolean }) => {
      setSaveStates((s) => ({ ...s, [questionId]: "saving" }));
      try {
        const res = await fetch(`/api/v1/exam/attempts/${attemptId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId, value: payload.value, textValue: payload.textValue }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.error === "LOCKED" || data.error === "SUBMITTED" || data.error === "EXPIRED") {
            setStatus(data.attemptStatus ?? (data.error === "LOCKED" ? "LOCKED" : "SUBMITTED"));
            setSaveStates((s) => ({ ...s, [questionId]: "error" }));
            return;
          }
          setSaveStates((s) => ({ ...s, [questionId]: "offline" }));
          return;
        }
        if (data.attemptStatus) setStatus(data.attemptStatus);
        if (typeof data.violations === "number") setViolations(data.violations);
        setSaveStates((s) => ({ ...s, [questionId]: "saved" }));
        setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], savedAt: data.savedAt } }));
      } catch {
        setSaveStates((s) => ({ ...s, [questionId]: "offline" }));
      }
    },
    [attemptId],
  );

  const patchAnswer = useCallback(
    (questionId: string, patch: Partial<RunnerAnswer>) => {
      setAnswers((prev) => {
        const base: RunnerAnswer = prev[questionId] ?? { questionId, value: [], textValue: "", flagged: false, savedAt: 0 };
        const next = { ...base, ...patch };
        setSaveStates((s) => ({ ...s, [questionId]: "dirty" }));
        if (pendingRef.current[questionId]) window.clearTimeout(pendingRef.current[questionId]);
        pendingRef.current[questionId] = window.setTimeout(() => {
          persist(questionId, { value: next.value, textValue: next.textValue, flagged: next.flagged });
        }, 550);
        return { ...prev, [questionId]: next };
      });
    },
    [persist],
  );

  /* ---------------------- integrity event reporting -------------------- */
  const reportEvent = useCallback(
    async (type: string, message?: string) => {
      if (locked || submittedRef.current) return;
      try {
        const res = await fetch(`/api/v1/exam/attempts/${attemptId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, clientTime: Date.now(), message }),
        });
        const data = await res.json();
        if (res.ok) {
          setViolations(data.violations);
          setStatus(data.status);
          if (data.status === "LOCKED") setWarning(null);
        }
      } catch {
        /* never block the exam because an event could not be reported */
      }
    },
    [attemptId, locked],
  );

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        reportEvent("APP_BACKGROUNDED");
        setWarning(
          l(
            "تم تسجيل خروجك من شاشة الاختبار. تكرار ذلك قد يؤدي إلى تجميد المحاولة.",
            "Leaving the exam screen was recorded. Repeating this may freeze the attempt.",
          ),
        );
      }
    };
    const onBlur = () => {
      blurTimer.current = window.setTimeout(() => {
        reportEvent("FOCUS_LOST");
        setFocusStrikes((s) => s + 1);
      }, 1200);
    };
    const onFocus = () => {
      if (blurTimer.current) window.clearTimeout(blurTimer.current);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "s")) {
        reportEvent("SCREENSHOT_ATTEMPT");
        setWarning(l("لقطات الشاشة غير مسموح بها في الاختبار.", "Screenshots are not permitted during the exam."));
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [reportEvent, l]);

  useEffect(() => {
    if (!online) reportEvent("NETWORK_LOST");
    else if (Object.values(saveStates).includes("offline")) {
      reportEvent("NETWORK_RESTORED");
      Object.entries(saveStates).forEach(([qid, st]) => {
        if (st === "offline" && answers[qid]) persist(qid, answers[qid]);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  /* ----------------------------- submit ------------------------------- */
  const doSubmit = useCallback(
    async (auto = false) => {
      if (submitting || submittedRef.current) return;
      setSubmitting(true);
      try {
        const res = await fetch(`/api/v1/exam/attempts/${attemptId}/submit`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          toast({ title: data.message ?? l("تعذر التسليم", "Submission failed"), tone: "error" });
          setSubmitting(false);
          return;
        }
        submittedRef.current = true;
        setSubmitted({ score: data.score ?? null, pendingManual: data.pendingManual ?? 0 });
        setSubmitOpen(false);
        if (auto) toast({ title: l("انتهى الوقت وتم التسليم تلقائياً.", "Time is up — submitted automatically."), tone: "warning" });
      } catch {
        toast({ title: l("تعذر الاتصال. إجاباتك محفوظة على الخادم.", "Connection failed. Your answers are saved server-side."), tone: "error" });
        setSubmitting(false);
      }
    },
    [attemptId, submitting, toast, l],
  );

  useEffect(() => {
    if (remaining === 0 && !submittedRef.current && !locked) {
      doSubmit(true);
    }
  }, [remaining, doSubmit, locked]);

  const counts = useMemo(
    () => ({
      answered: answeredCount,
      flagged: flaggedCount,
      unanswered: questions.length - answeredCount,
    }),
    [answeredCount, flaggedCount, questions.length],
  );

  /* ----------------------------- render ------------------------------- */
  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950 p-5 text-white">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-success-500/15 text-success-500 ring-1 ring-success-500/30">
            <Icon name="check" size={34} strokeWidth={2.5} />
          </span>
          <h1 className="text-xl font-semibold">{l("تم تسليم الاختبار", "Examination submitted")}</h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-white/60">
            {submitted.pendingManual > 0
              ? l(
                  `تم حفظ إجاباتك. الدرجة المبدئية للأسئلة الموضوعية ${submitted.score}، ويتبقى ${submitted.pendingManual} سؤالاً للتصحيح اليدوي.`,
                  `Answers saved. Objective score ${submitted.score}; ${submitted.pendingManual} answer(s) await manual grading.`,
                )
              : l(
                  `تم تصحيح الأسئلة الموضوعية على الخادم: ${submitted.score} من ${exam.totalMarks}.`,
                  `Objective questions were graded on the server: ${submitted.score} of ${exam.totalMarks}.`,
                )}
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-start">
            <p className="flex items-center justify-between text-[11px] text-white/60">
              <span>{l("الأسئلة المجابة", "Answered")}</span>
              <span className="tnum font-medium text-white">{counts.answered}/{questions.length}</span>
            </p>
            <p className="mt-1.5 flex items-center justify-between text-[11px] text-white/60">
              <span>{l("الحوادث المسجلة", "Recorded incidents")}</span>
              <span className="tnum font-medium text-white">{violations}</span>
            </p>
            <p className="mt-1.5 flex items-center justify-between text-[11px] text-white/60">
              <span>{l("حالة النشر", "Publication")}</span>
              <span className="font-medium text-white">{l("بانتظار إعلان المعلم", "Awaiting teacher release")}</span>
            </p>
          </div>
          <Button className="mt-5 w-full" variant="primary" onClick={() => router.replace("/student/results")}>
            {l("عرض النتائج", "View results")}
          </Button>
          <p className="mt-3 text-[10px] text-white/35">{l("يمكنك إغلاق هذه النافذة بأمان.", "It is now safe to close this window.")}</p>
        </div>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950 p-5 text-white">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-danger-500/15 text-danger-500 ring-1 ring-danger-500/30">
            <Icon name="lock" size={30} />
          </span>
          <h1 className="text-xl font-semibold">{l("تم تجميد المحاولة", "Attempt frozen")}</h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-white/60">
            {l(
              `سجّل النظام ${violations} حادثة أثناء جلستك، وتم إيقاف الجلسة وفق سياسة الاختبار. إجاباتك المحفوظة لم تُفقد، وسيراجع المراقب الحوادث ويمكنه استئناف المحاولة أو منح وقت إضافي.`,
              `The system recorded ${violations} incident(s) and froze the session under the exam policy. Your saved answers are intact; a supervisor will review and may resume the attempt or grant extra time.`,
            )}
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-start text-[11px] text-white/60">
            <p>{l("الجهاز", "Device")}: <span className="text-white">{deviceLabel}</span></p>
            <p className="mt-1">{l("الوقت المتبقي محفوظ", "Remaining time preserved")}: <span className="tnum text-white">{fmtCountdown(remaining)}</span></p>
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={() => router.push("/student/complaints/new?category=EXAM_INCIDENT")} icon="message">
              {l("تقديم طلب مراجعة", "Submit a review request")}
            </Button>
            <Button variant="ghost" onClick={() => router.push("/student")}>{l("العودة للرئيسية", "Back to home")}</Button>
          </div>
          <p className="mt-4 text-[10px] text-white/35">
            {l("لا يتم إعلان الغش آلياً — القرار للمراقب البشري.", "No automatic misconduct verdict — a human supervisor decides.")}
          </p>
        </div>
      </div>
    );
  }

  const a = answers[current.id];
  const saveState = saveStates[current.id] ?? "idle";
  const critical = remaining < 5 * 60_000;

  const setValue = (value: string[], textValue?: string) =>
    patchAnswer(current.id, { value, ...(textValue !== undefined ? { textValue } : {}) });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      {/* header */}
      <header className="shrink-0 border-b border-line bg-bg-elevated/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <LogoMark size={30} />
            <div className="min-w-0">
              <p className="truncate text-[11.5px] font-semibold text-fg">{l(exam.titleAr, exam.titleEn)}</p>
              <p className="truncate font-mono text-[9px] text-fg-muted">{exam.code} · {studentName}</p>
            </div>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <span
              className={cx(
                "tnum flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[15px] font-semibold",
                critical ? "border-danger-500/40 bg-danger-500/10 text-danger-500" : remaining < 15 * 60_000 ? "border-warn-500/40 bg-warn-500/10 text-warn-500" : "border-line bg-surface text-fg",
              )}
              role="timer"
              aria-label={l("الوقت المتبقي", "Time remaining")}
            >
              <Icon name="timer" size={14} />
              {fmtCountdown(remaining)}
            </span>
            <Button size="sm" icon="send" onClick={() => setSubmitOpen(true)} className="hidden sm:inline-flex">
              {l("تسليم", "Submit")}
            </Button>
          </div>
        </div>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 pb-2 text-[10px] text-fg-muted">
          <span className="flex items-center gap-1">
            <Icon name={online ? "wifi" : "wifi-off"} size={11} className={online ? "text-success-500" : "text-danger-500"} />
            {online ? l("متصل", "Online") : l("غير متصل — الحفظ المحلي مُفعّل", "Offline — local queue active")}
          </span>
          <span className="flex items-center gap-1">
            {saveState === "saving" ? <Spinner size={10} /> : <Icon name={saveState === "saved" ? "check-circle" : saveState === "offline" ? "alert" : "cloud" as never} size={11} className={saveState === "saved" ? "text-success-500" : saveState === "offline" ? "text-warn-500" : "text-fg-muted"} />}
            {saveState === "saving" ? l("جارٍ الحفظ على الخادم…", "Saving to server…") : saveState === "saved" ? l("محفوظ", "Saved") : saveState === "offline" ? l("بانتظار المزامنة", "Queued") : saveState === "dirty" ? l("تغييرات غير محفوظة", "Unsaved changes") : l("جاهز", "Ready")}
          </span>
          <span className="ms-auto hidden items-center gap-1 sm:flex">
            <Icon name="shield-check" size={11} /> {exam.policy} · {violations}/{exam.maxViolations}
          </span>
          <button onClick={() => setNavOpen(true)} className="flex items-center gap-1 font-medium text-accent-400 sm:hidden">
            <Icon name="grid" size={11} /> {l("الأسئلة", "Questions")}
          </button>
        </div>
        <Progress value={(answeredCount / questions.length) * 100} size="sm" className="rounded-none" tone="accent" />
      </header>

      {warning && (
        <div className="shrink-0 border-b border-warn-500/30 bg-warn-500/10 px-4 py-2 text-center text-[11px] text-warn-500">
          <Icon name="alert" size={12} className="me-1 inline" /> {warning}
          <button onClick={() => setWarning(null)} className="ms-2 underline">{l("إخفاء", "Dismiss")}</button>
        </div>
      )}

      {/* body */}
      <main className="min-h-0 flex-1 overflow-y-auto scroll-slim">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="tnum grid size-7 place-items-center rounded-lg bg-brand text-[11px] font-semibold text-white">{index + 1}</span>
              <span className="text-[10.5px] text-fg-muted">{l("من", "of")} {questions.length}</span>
              <Badge tone="neutral">{l(TYPE_LABEL[current.type]?.ar ?? current.type, TYPE_LABEL[current.type]?.en ?? current.type)}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-fg-muted">{current.marks} {l("درجة", "marks")}</span>
              <button
                onClick={() => patchAnswer(current.id, { flagged: !a?.flagged })}
                className={cx(
                  "flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition",
                  a?.flagged ? "border-warn-500/50 bg-warn-500/15 text-warn-500" : "border-line text-fg-muted hover:text-fg",
                )}
                aria-pressed={!!a?.flagged}
              >
                <Icon name="flag" size={11} /> {a?.flagged ? l("معلّم للمراجعة", "Flagged") : l("علّم للمراجعة", "Flag")}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-[14px] font-medium leading-relaxed text-fg">{l(current.promptAr, current.promptEn)}</p>

            {current.imageUrl && (
              <div className="mt-3 overflow-hidden rounded-lg border border-line bg-navy-950 p-3">
                <svg viewBox="0 0 320 160" className="w-full" role="img" aria-label={l("مخطط بياني للسؤال", "Diagram for the question")}>
                  <g stroke="#38A5FF" strokeWidth="1.6" fill="none">
                    <circle cx="60" cy="40" r="15" /><circle cx="160" cy="40" r="15" /><circle cx="260" cy="40" r="15" />
                    <circle cx="110" cy="115" r="15" /><circle cx="210" cy="115" r="15" />
                    <path d="M75 40h70M175 40h70M60 55l50 60M160 55l60 60M110 115h70" />
                  </g>
                  <g fill="#EAF4FF" fontSize="11" fontFamily="Inter">
                    {[["A", 60, 44], ["B", 160, 44], ["C", 260, 44], ["D", 110, 119], ["E", 210, 119]].map(([t, x, y]) => (
                      <text key={t as string} x={x as number} y={y as number} textAnchor="middle">{t}</text>
                    ))}
                  </g>
                </svg>
                <p className="mt-1 text-center text-[9px] text-fg-muted">{l("مخطط توضيحي — BFS من العقدة A", "Illustrative graph — BFS from node A")}</p>
              </div>
            )}

            <div className="mt-4">
              {(current.type === "MCQ" || current.type === "IMAGE") && (
                <div className="space-y-1.5" role="radiogroup" aria-label={l("الخيارات", "Options")}>
                  {current.options.map((opt, i) => {
                    const selected = a?.value.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setValue([opt.id])}
                        className={cx(
                          "tap flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition",
                          selected ? "border-brand bg-brand/10" : "border-line bg-bg-elevated/40 hover:border-line-strong hover:bg-surface-2",
                        )}
                      >
                        <span className={cx("grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-semibold", selected ? "border-brand bg-brand text-white" : "border-line-strong text-fg-muted")}>
                          {selected ? <Icon name="check" size={12} strokeWidth={3} /> : String.fromCharCode(65 + i)}
                        </span>
                        <span className="text-[12.5px] leading-snug text-fg">{l(opt.textAr, opt.textEn)}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {current.type === "TRUE_FALSE" && (
                <div className="grid grid-cols-2 gap-2">
                  {current.options.map((opt, i) => {
                    const selected = a?.value.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setValue([opt.id])}
                        aria-pressed={selected}
                        className={cx(
                          "tap flex flex-col items-center gap-1.5 rounded-xl border p-4 transition",
                          selected ? (i === 0 ? "border-success-500 bg-success-500/10" : "border-danger-500 bg-danger-500/10") : "border-line bg-bg-elevated/40 hover:border-line-strong",
                        )}
                      >
                        <Icon name={i === 0 ? "check-circle" : "x"} size={20} className={selected ? (i === 0 ? "text-success-500" : "text-danger-500") : "text-fg-muted"} />
                        <span className="text-[12px] font-medium text-fg">{l(opt.textAr, opt.textEn)}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {current.type === "FILL_BLANK" && (
                <label className="block">
                  <span className="mb-1.5 block text-[10.5px] text-fg-muted">{l("اكتب الإجابة", "Type your answer")}</span>
                  <input
                    value={a?.textValue ?? ""}
                    onChange={(e) => setValue([], e.target.value)}
                    placeholder={l("الإجابة…", "Your answer…")}
                    className="h-11 w-full rounded-lg border border-line-strong bg-bg-elevated px-3 text-[13px] text-fg placeholder:text-fg-muted focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                    dir="auto"
                  />
                </label>
              )}

              {current.type === "ESSAY" && (
                <label className="block">
                  <span className="mb-1.5 flex items-center justify-between text-[10.5px] text-fg-muted">
                    <span>{l("إجابتك", "Your answer")}</span>
                    <span className="tnum">{(a?.textValue ?? "").length}/4000</span>
                  </span>
                  <Textarea
                    value={a?.textValue ?? ""}
                    onChange={(e) => setValue([], e.target.value.slice(0, 4000))}
                    rows={8}
                    placeholder={l("اكتب إجابتك هنا… يتم الحفظ تلقائياً.", "Write your answer here… it saves automatically.")}
                    className="text-[13px]"
                    dir="auto"
                  />
                  <span className="mt-1 block text-[9.5px] text-fg-muted">
                    {l("يُصحَّح هذا السؤال يدوياً بواسطة المعلم.", "This answer is graded manually by your teacher.")}
                  </span>
                </label>
              )}

              {current.type === "MATCHING" && (
                <div className="space-y-2">
                  <p className="text-[10.5px] text-fg-muted">{l("اختر العنصر المطابق لكل بند بالترتيب الصحيح.", "Match each item to the correct counterpart.")}</p>
                  {current.options.map((opt, i) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <span className="tnum grid size-6 shrink-0 place-items-center rounded-md bg-surface-3 text-[10px] text-fg-muted">{i + 1}</span>
                      <select
                        value={a?.value?.[i] ?? ""}
                        onChange={(e) => {
                          const next = [...(a?.value ?? [])];
                          next[i] = e.target.value;
                          setValue(next);
                        }}
                        className="h-9 w-full rounded-lg border border-line-strong bg-bg-elevated px-2 text-[11.5px] text-fg focus:border-accent-500 focus:outline-none"
                      >
                        <option value="">{l("— اختر —", "— select —")}</option>
                        {current.options.map((o) => (
                          <option key={o.id} value={o.id}>{l(o.textAr, o.textEn)}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {current.type === "FILE" && (
                <div className="rounded-xl border border-dashed border-line-strong bg-bg-elevated/40 p-5 text-center">
                  <Icon name="upload" size={22} className="mx-auto text-fg-muted" />
                  <p className="mt-2 text-[11.5px] font-medium text-fg-soft">{l("رفع ملف الإجابة", "Upload your answer file")}</p>
                  <p className="mt-0.5 text-[10px] text-fg-muted">{l("PDF أو صور — بحد أقصى 10 ميجابايت", "PDF or images — max 10 MB")}</p>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setValue([], f.name);
                    }}
                    className="mt-3 w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-[10.5px] text-fg-muted file:me-2 file:rounded-md file:border-0 file:bg-brand file:px-2 file:py-1 file:text-[10px] file:text-white"
                  />
                  {a?.textValue && (
                    <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-success-500">
                      <Icon name="file-check" size={11} /> {a.textValue} ({l("محاكاة — بدون رفع فعلي", "simulated — no upload")})
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-[9.5px] leading-relaxed text-fg-muted">
            <Icon name="info" size={11} className="mt-0.5 shrink-0" />
            {l(
              "الكشف عن مغادرة الشاشة يعمل بأفضل جهد ممكن على الويب ولا يضمن قفلاً كاملاً للجهاز. الأجهزة المُدارة من المؤسسة تُستخدم معها سياسات Android Enterprise.",
              "Focus-loss detection is best-effort on the web and never guarantees a full device lockdown. Institution-managed devices use Android Enterprise policies.",
            )}
          </p>
        </div>
      </main>

      {/* footer */}
      <footer className="shrink-0 border-t border-line bg-bg-elevated/95 px-4 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Button variant="outline" size="sm" icon="chevron-right" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
            <span className="hidden sm:inline">{l("السابق", "Previous")}</span>
          </Button>
          <button onClick={() => setNavOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[10.5px] text-fg-muted transition hover:text-fg">
            <Icon name="grid" size={12} />
            <span className="tnum">{answeredCount}/{questions.length}</span>
          </button>
          {index < questions.length - 1 ? (
            <Button size="sm" iconEnd="chevron-left" onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))} className="flex-1">
              {l("التالي", "Next")}
            </Button>
          ) : (
            <Button size="sm" icon="send" onClick={() => setSubmitOpen(true)} className="flex-1">
              {l("تسليم الاختبار", "Submit exam")}
            </Button>
          )}
        </div>
      </footer>

      {/* navigator */}
      <Modal open={navOpen} onClose={() => setNavOpen(false)} title={l("خريطة الأسئلة", "Question navigator")} description={`${answeredCount} ${l("مجابة", "answered")} · ${flaggedCount} ${l("معلّمة", "flagged")} · ${counts.unanswered} ${l("بدون إجابة", "unanswered")}`}>
        <div className="grid grid-cols-6 gap-2">
          {questions.map((q, i) => {
            const ans = answers[q.id];
            const isAnswered = ans && (ans.value.length > 0 || ans.textValue.trim().length > 0);
            return (
              <button
                key={q.id}
                onClick={() => { setIndex(i); setNavOpen(false); }}
                className={cx(
                  "relative grid aspect-square place-items-center rounded-lg border text-[11px] font-semibold transition",
                  i === index ? "border-accent-500 bg-accent-500/15 text-accent-300" : isAnswered ? "border-success-500/40 bg-success-500/10 text-success-500" : "border-line bg-surface-2 text-fg-muted",
                )}
                aria-label={`${l("سؤال", "Question")} ${i + 1}`}
              >
                {i + 1}
                {ans?.flagged && <span className="absolute end-0.5 top-0.5 size-1.5 rounded-full bg-warn-500" />}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-3 text-[10px] text-fg-muted">
          <span className="flex items-center gap-1"><span className="size-2 rounded bg-success-500/40" /> {l("مجابة", "Answered")}</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded bg-warn-500" /> {l("معلّمة", "Flagged")}</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded bg-surface-3" /> {l("بدون إجابة", "Unanswered")}</span>
        </div>
        <Button className="mt-3 w-full" icon="send" onClick={() => { setNavOpen(false); setSubmitOpen(true); }}>
          {l("مراجعة وتسليم", "Review & submit")}
        </Button>
      </Modal>

      {/* submit confirm */}
      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title={l("تأكيد تسليم الاختبار", "Confirm submission")}
        tone="warning"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setSubmitOpen(false)}>{l("متابعة الحل", "Keep working")}</Button>
            <Button size="sm" loading={submitting} icon="send" onClick={() => doSubmit(false)}>{l("نعم، سلّم الآن", "Yes, submit now")}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[12.5px] leading-relaxed text-fg-soft">
            {l("لا يمكن التراجع عن التسليم بعد التأكيد. تأكد من مراجعة الأسئلة المعلّمة.", "Submission cannot be undone. Review flagged questions first.")}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              [counts.answered, l("مجابة", "answered"), "text-success-500"],
              [counts.unanswered, l("بدون إجابة", "unanswered"), "text-danger-500"],
              [counts.flagged, l("معلّمة", "flagged"), "text-warn-500"],
            ].map(([v, k, c]) => (
              <div key={k as string} className="rounded-lg border border-line bg-surface-2 py-2">
                <p className={cx("tnum text-[16px] font-semibold", c as string)}>{v}</p>
                <p className="text-[9.5px] text-fg-muted">{k}</p>
              </div>
            ))}
          </div>
          <p className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-2 text-[9.5px] text-fg-muted">
            <Icon name="info" size={11} /> {l("سيبقى الوقت المتبقي", "Time remaining")} <span className="tnum font-medium">{fmtCountdown(remaining)}</span> {l("قيد المراجعة على الخادم", "remains on the server record")}
          </p>
        </div>
      </Modal>
    </div>
  );
}
