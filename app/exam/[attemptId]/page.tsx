import { notFound, redirect } from "next/navigation";
import { ExamRunner } from "@/components/exam/exam-runner";
import { requireRole } from "@/lib/server/auth";
import { findAttempt, findExam, findQuestion } from "@/lib/server/store";
import { attemptQuestions, hashSeed, remainingMs, seededShuffle } from "@/lib/server/exam";
import { getPrefs } from "@/lib/prefs";

export const metadata = { title: "الاختبار الآمن" };
export const dynamic = "force-dynamic";

export default async function SecureExamPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const user = await requireRole(["STUDENT"]);
  const { locale } = await getPrefs();
  const { attemptId } = await params;
  const attempt = findAttempt(attemptId);
  if (!attempt || attempt.studentId !== user.studentId) notFound();

  if (attempt.status === "NOT_STARTED") redirect(`/student/exams/${attempt.examinationId}`);
  if (["SUBMITTED", "GRADING", "GRADED"].includes(attempt.status)) {
    redirect(`/student/results?exam=${attempt.examinationId}`);
  }

  const exam = findExam(attempt.examinationId)!;
  if (!attempt.questionOrder?.length) {
    attempt.questionOrder = exam.questionIds;
  }

  /* Options are shuffled server-side per attempt; the client never sees the
     correct answers, so manipulation is pointless. */
  const questions = attemptQuestions(attempt).map((q) => ({
    id: q.id,
    type: q.type,
    promptAr: q.promptAr,
    promptEn: q.promptEn,
    marks: q.marks,
    imageUrl: q.imageUrl,
    options: seededShuffle(q.options, hashSeed(`${attempt.id}:${q.id}:opt`)).map((o) => ({
      id: o.id,
      textAr: o.textAr,
      textEn: o.textEn,
    })),
  }));

  const answers = attempt.answers.map((a) => ({
    questionId: a.questionId,
    value: a.value,
    textValue: a.textValue ?? "",
    flagged: a.flagged,
    savedAt: a.savedAt,
  }));

  return (
    <ExamRunner
      attemptId={attempt.id}
      locale={locale}
      studentName={user.nameAr}
      exam={{
        titleAr: exam.titleAr,
        titleEn: exam.titleEn,
        code: exam.code,
        policy: exam.policy,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
        durationMin: exam.durationMin,
        maxViolations: exam.maxViolations,
      }}
      questions={questions}
      initialAnswers={answers}
      serverNow={Date.now()}
      endsAt={attempt.endsAt ?? Date.now() + remainingMs(attempt)}
      status={attempt.status}
      violations={attempt.violations}
      deviceLabel={attempt.deviceLabel}
    />
  );
}
