import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { findAttempt } from "@/lib/server/store";
import { recordEvent, remainingMs } from "@/lib/server/exam";
import type { ExamEventType } from "@/lib/types";

const ALLOWED: ExamEventType[] = [
  "APP_BACKGROUNDED", "FOCUS_LOST", "SPLIT_SCREEN", "SCREENSHOT_ATTEMPT",
  "UNAUTHORIZED_APP", "NETWORK_LOST", "NETWORK_RESTORED", "WORK_SAVED_ON_SUBMIT",
];

/**
 * POST /api/v1/exam/attempts/:id/events
 * Client-reported integrity signals. Server timestamps are authoritative and
 * the client-supplied time is stored only as a secondary field. A network drop
 * is recorded as INFO and never counts as a violation.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await params;
  const attempt = findAttempt(id);
  if (!attempt || attempt.studentId !== user.studentId) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  let body: { type?: ExamEventType; clientTime?: number; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (!body.type || !ALLOWED.includes(body.type)) {
    return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
  }

  const copy: Record<string, { ar: string; en: string }> = {
    APP_BACKGROUNDED: { ar: "انتقل تطبيق الاختبار إلى الخلفية.", en: "Exam app was backgrounded." },
    FOCUS_LOST: { ar: "فقدان تركيز نافذة الاختبار.", en: "Exam window lost focus." },
    SPLIT_SCREEN: { ar: "استخدام وضع تقسيم الشاشة أثناء الاختبار.", en: "Split-screen mode used during the exam." },
    SCREENSHOT_ATTEMPT: { ar: "محاولة التقاط شاشة أثناء الاختبار.", en: "Screenshot attempt during the exam." },
    UNAUTHORIZED_APP: { ar: "محاولة الانتقال لتطبيق غير مسموح.", en: "Attempt to switch to a disallowed app." },
    NETWORK_LOST: { ar: "انقطاع الشبكة على جهاز الطالب.", en: "Network lost on the student device." },
    NETWORK_RESTORED: { ar: "عادت الشبكة وتمت مزامنة الحالة.", en: "Network restored and state re-synced." },
    WORK_SAVED_ON_SUBMIT: { ar: "تم حفظ العمل محلياً قبل إعادة المزامنة.", en: "Work saved locally before re-sync." },
  };

  recordEvent(attempt, body.type, copy[body.type], {
    clientTime: body.clientTime,
    severity: body.type === "SCREENSHOT_ATTEMPT" ? "CRITICAL" : body.type.startsWith("NETWORK") ? "INFO" : "WARNING",
  });

  return NextResponse.json({
    ok: true,
    status: attempt.status,
    violations: attempt.violations,
    remainingMs: remainingMs(attempt),
    serverNow: Date.now(),
  });
}
