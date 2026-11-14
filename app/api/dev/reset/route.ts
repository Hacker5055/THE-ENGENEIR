import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import { buildSeed } from "@/lib/server/seed";

/**
 * Demo data reset — 404 unless ALLOW_DEV_SESSION=1 (or a development build).
 *
 * Two uses:
 *  - `{ reseed: true }` restores the whole demo dataset (handy when a demo has
 *    drifted after a day of clicking around).
 *  - `{ examId, studentId }` clears one student's attempt so the same exam can
 *    be taken again — this is what keeps `scripts/smoke.mjs` repeatable against
 *    a long-running server.
 */
export async function POST(req: Request) {
  const enabled = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_SESSION === "1";
  if (!enabled) return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    reseed?: boolean;
    examId?: string;
    studentId?: string;
  };

  if (body.reseed) {
    const store = globalThis as unknown as { __AM_DB?: unknown };
    store.__AM_DB = buildSeed();
    return NextResponse.json({ ok: true, mode: "reseed" });
  }

  if (!body.examId || !body.studentId) {
    return NextResponse.json({ error: "EXAM_AND_STUDENT_REQUIRED" }, { status: 400 });
  }

  const database = db();
  const before = database.attempts.length;
  database.attempts = database.attempts.filter(
    (a) => !(a.examinationId === body.examId && a.studentId === body.studentId),
  );
  return NextResponse.json({ ok: true, mode: "attempt", removed: before - database.attempts.length });
}
