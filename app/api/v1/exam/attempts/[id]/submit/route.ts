import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { findAttempt } from "@/lib/server/store";
import { submitAttempt } from "@/lib/server/exam";

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
  return NextResponse.json({
    ok: true,
    attemptId: attempt.id,
    status: attempt.status,
    already: result.already,
    score: attempt.score ?? null,
    maxScore: attempt.maxScore,
    pendingManual: result.already ? 0 : result.pendingManual,
  });
}
