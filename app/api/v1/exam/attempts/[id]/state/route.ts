import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { findAttempt } from "@/lib/server/store";
import { publicAttemptState } from "@/lib/server/exam";

/** GET /api/v1/exam/attempts/:id/state — authoritative status, timer, progress. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { id } = await params;
  const attempt = findAttempt(id);
  if (!attempt) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const isOwner = user.role === "STUDENT" && attempt.studentId === user.studentId;
  const isStaff = ["TEACHER", "EXAM_SUPERVISOR", "INSTITUTION_ADMIN", "SUPER_ADMIN"].includes(user.role);
  if (!isOwner && !isStaff) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  attempt.lastHeartbeat = Date.now();
  return NextResponse.json(publicAttemptState(attempt), { headers: { "Cache-Control": "no-store" } });
}
