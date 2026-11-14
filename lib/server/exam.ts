import "server-only";
import { db, findExam, findQuestion, notify, pushAudit } from "@/lib/server/store";
import type { ExaminationAttempt, ExamEventType, Question, SessionUser } from "@/lib/types";

/* ------------------------------- utilities ------------------------------ */
export function hashSeed(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic Fisher–Yates — same seed always yields the same order. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function remainingMs(attempt: ExaminationAttempt) {
  if (!attempt.endsAt) return 0;
  return Math.max(0, attempt.endsAt - Date.now());
}

export function attemptQuestions(attempt: ExaminationAttempt): Question[] {
  return attempt.questionOrder.map((id) => findQuestion(id)).filter((q): q is Question => !!q);
}

const VIOLATION_TYPES: ExamEventType[] = [
  "APP_BACKGROUNDED",
  "FOCUS_LOST",
  "SPLIT_SCREEN",
  "SCREENSHOT_ATTEMPT",
  "UNAUTHORIZED_APP",
  "DEVICE_MISMATCH",
];

/* ------------------------------ grading --------------------------------- */
export function gradeAttempt(attempt: ExaminationAttempt) {
  const exam = findExam(attempt.examinationId)!;
  let total = 0;
  let pendingManual = 0;

  for (const question of attemptQuestions(attempt)) {
    const answer = attempt.answers.find((a) => a.questionId === question.id);
    // An unanswered question scores zero; it never blocks the attempt behind a
    // human marker, because there is nothing for the marker to read.
    if (!answer) continue;
    if (answer.awardedMarks !== undefined) {
      total += answer.awardedMarks;
      continue;
    }
    if (question.type === "MCQ" || question.type === "TRUE_FALSE" || question.type === "IMAGE") {
      const correct = question.correct.length > 0 && question.correct.every((c) => answer.value.includes(c)) && answer.value.length === question.correct.length;
      answer.awardedMarks = correct ? question.marks : 0;
      answer.gradedAt = Date.now();
      total += answer.awardedMarks;
    } else if (question.type === "FILL_BLANK") {
      const normalize = (s: string) => s.trim().toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/[\s\u0640]+/g, " ");
      const given = normalize(answer.textValue ?? answer.value.join(" "));
      const ok = question.correct.some((c) => normalize(c) === given);
      answer.awardedMarks = ok ? question.marks : 0;
      answer.gradedAt = Date.now();
      total += answer.awardedMarks;
    } else {
      pendingManual += 1;
    }
  }

  attempt.score = Math.round(total * 100) / 100;
  attempt.maxScore = exam.totalMarks;
  attempt.passed = attempt.score >= exam.passingMarks;
  return { score: attempt.score, pendingManual };
}

/* ------------------------------ events ---------------------------------- */
export function recordEvent(
  attempt: ExaminationAttempt,
  type: ExamEventType,
  detail: { ar: string; en: string },
  opts: { severity?: "INFO" | "WARNING" | "CRITICAL"; clientTime?: number; actor?: SessionUser; reason?: string } = {},
) {
  const exam = findExam(attempt.examinationId)!;
  const isViolation = VIOLATION_TYPES.includes(type);
  const severity = opts.severity ?? (isViolation ? "WARNING" : "INFO");

  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    attemptId: attempt.id,
    examinationId: attempt.examinationId,
    studentId: attempt.studentId,
    type,
    severity,
    serverTime: Date.now(),
    clientTime: opts.clientTime,
    detailAr: detail.ar,
    detailEn: detail.en,
    actorId: opts.actor?.id,
    reason: opts.reason,
    deviceLabel: attempt.deviceLabel,
  };
  db().examEvents.unshift(event);

  if (isViolation && attempt.status !== "CANCELLED") {
    attempt.violations += 1;
    if (attempt.violations > 0 && attempt.status === "IN_PROGRESS") attempt.status = "FLAGGED";
    if (exam.lockOnViolation && attempt.violations >= exam.maxViolations && attempt.status !== "LOCKED") {
      attempt.status = "LOCKED";
      db().examEvents.unshift({
        id: `evt_${Date.now() + 1}_lock`,
        attemptId: attempt.id,
        examinationId: attempt.examinationId,
        studentId: attempt.studentId,
        type: "SESSION_FROZEN",
        severity: "CRITICAL",
        serverTime: Date.now() + 1,
        detailAr: `تم تجميد المحاولة تلقائياً بعد ${attempt.violations} حادثة (الحد ${exam.maxViolations}). الإجابات المحفوظة لم تُفقد.`,
        detailEn: `Attempt frozen automatically after ${attempt.violations} incidents (limit ${exam.maxViolations}). Saved answers preserved.`,
        deviceLabel: attempt.deviceLabel,
      });
      notify({
        userId: "usr_supervisor",
        role: "EXAM_SUPERVISOR",
        category: "EXAM",
        titleAr: "محاولة مقيّدة بحاجة إلى مراجعة",
        titleEn: "Locked attempt needs review",
        bodyAr: `تم تجميد محاولة في «${exam.titleAr}» بعد ${attempt.violations} حادثة.`,
        bodyEn: `An attempt in “${exam.titleEn}” was frozen after ${attempt.violations} incidents.`,
        href: `/admin/exam-control/${attempt.id}`,
        priority: "HIGH",
      });
      pushAudit({
        actorId: "system",
        actorName: "نظام المراقبة",
        actorRole: "SYSTEM",
        action: "exam.auto_freeze",
        actionAr: "تجميد تلقائي لمحاولة اختبار",
        target: attempt.id,
        reason: `${attempt.violations} حوادث — سياسة ${exam.policy}`,
        severity: "CRITICAL",
      });
    }
  }
  return event;
}

/* -------------------------- start / submit ------------------------------- */
export function startAttempt(user: SessionUser, examId: string) {
  const exam = findExam(examId);
  if (!exam) return { ok: false as const, error: "NOT_FOUND", message: "الاختبار غير موجود." };
  const now = Date.now();
  if (exam.status !== "LIVE") return { ok: false as const, error: "NOT_LIVE", message: "الاختبار غير متاح للبدء الآن." };
  if (now < exam.startsAt) return { ok: false as const, error: "NOT_STARTED", message: "لم يبدأ وقت الاختبار بعد." };
  if (now > exam.endsAt) return { ok: false as const, error: "CLOSED", message: "انتهى وقت الاختبار." };

  let attempt = db().attempts.find((a) => a.examinationId === examId && a.studentId === user.studentId);

  // Enrolled students sit the exam without a pre-issued attempt row: the server
  // mints one here, bounded by the examination's allowed-attempts policy.
  if (!attempt) {
    const student = db().students.find((st) => st.id === user.studentId);
    if (!student) return { ok: false as const, error: "FORBIDDEN", message: "لا تملك صلاحية دخول هذا الاختبار." };
    const enrolled =
      student.enrolledCourseIds?.includes(exam.courseId) ||
      db().courses.some((c) => c.id === exam.courseId && c.sectionId === student.sectionId);
    if (!enrolled) return { ok: false as const, error: "FORBIDDEN", message: "هذا الاختبار ليس ضمن مقرراتك." };

    const taken = db().attempts.filter(
      (a) => a.examinationId === examId && a.studentId === user.studentId,
    ).length;
    if (taken >= exam.allowedAttempts) {
      return { ok: false as const, error: "ATTEMPTS_EXHAUSTED", message: "استنفدت عدد المحاولات المسموح بها." };
    }

    const device = db().devices.find((d) => d.studentId === user.studentId && d.status === "ACTIVE");
    attempt = {
      id: `att_${user.studentId}_${Date.now().toString(36)}`,
      examinationId: examId,
      studentId: user.studentId!,
      status: "NOT_STARTED",
      serverNowOffsetMs: 0,
      questionOrder: exam.randomizeQuestions
        ? seededShuffle(exam.questionIds, hashSeed(`${user.studentId}:${now}`))
        : [...exam.questionIds],
      answers: [],
      violations: 0,
      maxScore: exam.totalMarks,
      deviceId: device?.id ?? "dev_unregistered",
      deviceLabel: device ? `${device.model || device.label} — ${device.managed ? "جهاز مُدار" : "جهاز شخصي"}` : "جهاز غير مسجّل",
      ip: "10.20.0.1",
      lastHeartbeat: now,
    };
    db().attempts.push(attempt);
    pushAudit({
      actorId: user.id,
      actorName: user.nameAr,
      actorRole: user.role,
      action: "exam.attempt.created",
      actionAr: "إنشاء محاولة اختبار للطالب",
      target: attempt.id,
      severity: "INFO",
    });
  }
  if (attempt.status === "LOCKED" || attempt.status === "CANCELLED") {
    return { ok: false as const, error: "LOCKED", message: "المحاولة مقيّدة. يلزم قرار من المراقب لاستئنافها." };
  }
  if (attempt.status === "SUBMITTED" || attempt.status === "GRADED" || attempt.status === "GRADING") {
    return { ok: false as const, error: "ALREADY_SUBMITTED", message: "تم تسليم هذه المحاولة مسبقاً.", attemptId: attempt.id };
  }
  if (attempt.status === "IN_PROGRESS" || attempt.status === "FLAGGED") {
    return { ok: true as const, attemptId: attempt.id, resumed: true };
  }

  const priorAttempts = db().attempts.filter(
    (a) => a.examinationId === examId && a.studentId === user.studentId && ["SUBMITTED", "GRADED", "GRADING"].includes(a.status),
  ).length;
  if (priorAttempts >= exam.allowedAttempts) {
    return { ok: false as const, error: "ATTEMPTS_EXHAUSTED", message: "استنفدت عدد المحاولات المسموح بها." };
  }

  attempt.startedAt = now;
  attempt.endsAt = now + exam.durationMin * 60_000 + (attempt.extraTimeMin ?? 0) * 60_000;
  attempt.status = "IN_PROGRESS";
  attempt.lastHeartbeat = now;
  attempt.answers = [];
  attempt.questionOrder = exam.randomizeQuestions
    ? seededShuffle(exam.questionIds, hashSeed(`${attempt.id}:q:${now}`))
    : [...exam.questionIds];
  attempt.serverNowOffsetMs = 0;

  recordEvent(attempt, "EXAM_STARTED", {
    ar: "بدأ الطالب الاختبار بعد قبول قواعد الاختبار والتحقق من الجهاز.",
    en: "Student started the exam after accepting the rules and device verification.",
  });
  pushAudit({
    actorId: user.id,
    actorName: user.nameAr,
    actorRole: user.role,
    action: "exam.start",
    actionAr: "بدء محاولة اختبار",
    target: attempt.id,
    severity: "INFO",
  });

  return { ok: true as const, attemptId: attempt.id, resumed: false };
}

export function saveAnswer(
  attempt: ExaminationAttempt,
  questionId: string,
  value: string[],
  textValue?: string,
  nextRevision?: number,
) {
  if (attempt.status === "LOCKED" || attempt.status === "CANCELLED") {
    return { ok: false as const, error: "LOCKED", message: "المحاولة مقيّدة ولا يمكن حفظ إجابات جديدة." };
  }
  if (attempt.status === "SUBMITTED" || attempt.status === "GRADED" || attempt.status === "GRADING") {
    return { ok: false as const, error: "SUBMITTED", message: "تم تسليم المحاولة." };
  }
  if (remainingMs(attempt) <= 0) {
    return { ok: false as const, error: "EXPIRED", message: "انتهى وقت الاختبار على الخادم." };
  }
  const question = findQuestion(questionId);
  if (!question || !attempt.questionOrder.includes(questionId)) {
    return { ok: false as const, error: "INVALID_QUESTION", message: "السؤال غير تابع لهذه المحاولة." };
  }

  const existing = attempt.answers.find((a) => a.questionId === questionId);
  const now = Date.now();

  // Optimistic concurrency: the client sends the revision it intends to write.
  // A stale tab (or a retried request) can never overwrite a newer answer.
  const expectedRevision = existing ? existing.revision + 1 : 1;
  if (nextRevision != null && nextRevision !== expectedRevision) {
    return {
      ok: false as const,
      error: "REVISION_CONFLICT",
      message: "نسخة أقدم من المحفوظة على الخادم — أعد تحميل الحالة.",
      currentRevision: existing?.revision ?? 0,
    };
  }

  if (existing) {
    existing.value = value;
    existing.textValue = textValue ?? existing.textValue;
    existing.savedAt = now;
    existing.revision += 1;
  } else {
    attempt.answers.push({ questionId, value, textValue, savedAt: now, revision: 1, flagged: false });
  }
  attempt.lastHeartbeat = now;
  return { ok: true as const, savedAt: now, revision: (attempt.answers.find((a) => a.questionId === questionId)?.revision ?? 1) };
}

export function submitAttempt(attempt: ExaminationAttempt) {
  if (attempt.status === "SUBMITTED" || attempt.status === "GRADED" || attempt.status === "GRADING") {
    return { ok: true as const, already: true, attemptId: attempt.id };
  }
  if (attempt.status === "LOCKED") {
    return { ok: false as const, error: "LOCKED", message: "لا يمكن التسليم أثناء تجميد المحاولة. تواصل مع المراقب." };
  }
  const exam = findExam(attempt.examinationId)!;
  attempt.submittedAt = Date.now();
  attempt.lastHeartbeat = Date.now();

  const { score, pendingManual } = gradeAttempt(attempt);
  // Objective items are final; any essay/file answer keeps the attempt open for
  // a human marker instead of silently awarding zero.
  attempt.status = pendingManual > 0 ? "SUBMITTED" : "GRADED";
  if (attempt.status === "GRADED" && exam.resultPublished) {
    attempt.publishedAt = Date.now();
  }
  recordEvent(attempt, "EXAM_SUBMITTED", {
    ar: pendingManual > 0
      ? `تم التسليم. درجات الأسئلة الموضوعية ${score} — ${pendingManual} سؤالاً بانتظار تصحيح يدوي.`
      : `تم التسليم وتصحيحه آلياً: ${score} من ${exam.totalMarks}.`,
    en: pendingManual > 0
      ? `Submitted. Objective score ${score} — ${pendingManual} answer(s) awaiting manual grading.`
      : `Submitted and auto-graded: ${score} of ${exam.totalMarks}.`,
  });
  pushAudit({
    actorId: attempt.studentId,
    actorName: "طالب",
    actorRole: "STUDENT",
    action: "exam.submit",
    actionAr: "تسليم محاولة اختبار",
    target: attempt.id,
    severity: "INFO",
  });
  if (pendingManual > 0) {
    notify({
      userId: exam.teacherId,
      role: "TEACHER",
      category: "RESULT",
      titleAr: "سؤال مقالي بانتظار التصحيح",
      titleEn: "Essay awaiting grading",
      bodyAr: `محاولة في «${exam.titleAr}» تحتاج تصحيحاً يدوياً.`,
      bodyEn: `An attempt in “${exam.titleEn}” needs manual grading.`,
      href: `/teacher/grading/${attempt.id}`,
      priority: "HIGH",
    });
  }
  return { ok: true as const, already: false, attemptId: attempt.id, score, pendingManual, status: attempt.status };
}

export function publicAttemptState(attempt: ExaminationAttempt) {
  const exam = findExam(attempt.examinationId)!;
  return {
    attemptId: attempt.id,
    examinationId: exam.id,
    status: attempt.status,
    serverNow: Date.now(),
    endsAt: attempt.endsAt ?? null,
    remainingMs: remainingMs(attempt),
    violations: attempt.violations,
    maxViolations: exam.maxViolations,
    savedCount: attempt.answers.length,
    totalQuestions: attempt.questionOrder.length,
    score: attempt.score ?? null,
    policy: exam.policy,
  };
}
