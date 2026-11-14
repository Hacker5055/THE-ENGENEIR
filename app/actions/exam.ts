"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/server/auth";
import { findAttempt } from "@/lib/server/store";
import { startAttempt } from "@/lib/server/exam";

export async function startExamAction(formData: FormData) {
  const user = await requireRole(["STUDENT"]);
  const examId = String(formData.get("examId") ?? "");
  const accepted = formData.get("accept") === "on";

  if (!accepted) {
    redirect(`/student/exams/${examId}?error=rules`);
  }

  const result = startAttempt(user, examId);
  if (!result.ok) {
    redirect(`/student/exams/${examId}?error=${result.error.toLowerCase()}`);
  }
  redirect(`/exam/${result.attemptId}`);
}

export async function resumeExamAction(formData: FormData) {
  const user = await requireRole(["STUDENT"]);
  const attemptId = String(formData.get("attemptId") ?? "");
  const attempt = findAttempt(attemptId);
  if (!attempt || attempt.studentId !== user.studentId) redirect("/student/exams");
  if (attempt.status === "LOCKED") redirect(`/student/exams/${attempt.examinationId}?error=locked`);
  redirect(`/exam/${attemptId}`);
}
