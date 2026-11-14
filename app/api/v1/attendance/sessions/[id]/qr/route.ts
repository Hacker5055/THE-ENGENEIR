import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { db } from "@/lib/server/store";
import { qrSvg } from "@/lib/qr";

/**
 * GET /api/v1/attendance/sessions/:id/qr
 * Server-rendered SVG of the *current* rotating check-in token.
 *
 * The signing token never leaves the server except inside the QR image, and it
 * is rotated here on expiry so a screenshot of the previous frame is useless.
 * Response is explicitly non-cacheable.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { id } = await params;
  const session = db().attendanceSessions.find((s) => s.id === id);
  if (!session) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const isOwner = user.role === "TEACHER" && session.teacherId === user.teacherId;
  const isAdmin = ["INSTITUTION_ADMIN", "SUPER_ADMIN", "EXAM_SUPERVISOR"].includes(user.role);
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (session.status !== "OPEN") return NextResponse.json({ error: "SESSION_CLOSED" }, { status: 409 });

  if (session.qrExpiresAt <= Date.now()) {
    session.qrToken = `QR-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    session.qrExpiresAt = Date.now() + 20_000;
  }

  const url = new URL(req.url);
  const theme = url.searchParams.get("theme") === "light" ? "#0B1424" : "#FFFFFF";
  const payload = `AM-V1|${session.id}|${session.qrToken}|${session.qrExpiresAt}`;
  const svg = await qrSvg(payload, { dark: theme });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "X-Token-Expires-At": String(session.qrExpiresAt),
    },
  });
}
