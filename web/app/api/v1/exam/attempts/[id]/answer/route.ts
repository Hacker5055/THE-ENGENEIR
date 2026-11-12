import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { findAttempt } from "@/lib/server/store";
import { saveAnswer } from "@/lib/server/exam";

/**
 * POST /api/v1/exam/attempts/:id/answer
 * Persists a single answer immediately. The server owns the timer and refuses
 * writes after the authoritative end time, after submission, or when locked.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await params;
  const attempt = findAttempt(id);
  if (!attempt || attempt.studentId !== user.studentId) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  let body: { questionId?: string; value?: string[]; textValue?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (!body.questionId) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const result = saveAnswer(attempt, body.questionId, Array.isArray(body.value) ? body.value.slice(0, 10) : [], body.textValue?.slice(0, 8000));
  if (!result.ok) {
    return NextResponse.json({ error: result.error, message: result.message, attemptStatus: attempt.status }, { status: 409 });
  }
  return NextResponse.json({ ...result, attemptStatus: attempt.status, violations: attempt.violations });
}
