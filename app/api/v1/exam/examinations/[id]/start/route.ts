import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { startAttempt } from "@/lib/server/exam";
import { findExam } from "@/lib/server/store";

/**
 * POST /api/v1/exam/examinations/:id/start
 * The mobile client calls this (or the equivalent server action) — the server
 * decides whether an attempt may start, how long it runs, and the item order.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await params;
  const exam = findExam(id);
  if (!exam) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const result = startAttempt(user, id);
  if (!result.ok) return NextResponse.json(result, { status: 409 });
  return NextResponse.json({ ok: true, attemptId: result.attemptId, resumed: result.resumed });
}
