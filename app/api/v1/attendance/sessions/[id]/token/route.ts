import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { db, findStudent } from "@/lib/server/store";

/**
 * GET /api/v1/attendance/sessions/:id/token
 * Returns the current rotating check-in token. The token is short-lived and is
 * rotated server-side on expiry — the client never mints one.
 * Authorised for the session teacher and enrolled students (so the prototype
 * can simulate a camera scan). In production students only ever read it from
 * the QR rendered on the teacher's screen.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { id } = await params;
  const session = db().attendanceSessions.find((s) => s.id === id);
  if (!session) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const isTeacher = user.role === "TEACHER" && session.teacherId === user.teacherId;
  const student = user.studentId ? findStudent(user.studentId) : undefined;
  const isEnrolled = !!student && student.enrolledCourseIds.includes(session.courseId);
  const isAdmin = ["INSTITUTION_ADMIN", "SUPER_ADMIN"].includes(user.role);
  if (!isTeacher && !isEnrolled && !isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (session.status !== "OPEN") {
    return NextResponse.json({ error: "SESSION_CLOSED" }, { status: 409 });
  }

  // Rotate on expiry (20s window) — a stale token can never be replayed.
  if (session.qrExpiresAt <= Date.now()) {
    session.qrToken = `QR-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    session.qrExpiresAt = Date.now() + 20_000;
  }

  return NextResponse.json({
    sessionId: session.id,
    token: session.qrToken,
    expiresAt: session.qrExpiresAt,
    serverNow: Date.now(),
    geo: session.geo,
    expectedCount: session.expectedCount,
    courseId: session.courseId,
  });
}
