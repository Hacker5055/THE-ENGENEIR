import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { findAttempt } from "@/lib/server/store";
import { submitAttempt, gradeAttempt } from "@/lib/server/exam";

/** POST /api/v1/exam/attempts/:id/submit — server-side grading in one step. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await params;
  const attempt = findAttempt(id);
  if (!attempt || attempt.studentId !== user.studentId) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const result = submitAttempt(attempt);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, message: result.message }, { status: 409 });
  }
  const graded = attempt.status === "GRADED" ? gradeAttempt(attempt) : null;
  return NextResponse.json({
    ok: true,
    attemptId: attempt.id,
    status: attempt.status,
    score: attempt.score ?? null,
    maxScore: attempt.maxScore,
    pendingManual: graded?.pendingManual ?? 0,
  });
}
