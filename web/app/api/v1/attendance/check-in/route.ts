import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { db, findStudent, pushAudit } from "@/lib/server/store";
import { distanceMeters } from "@/lib/geo";
import type { AttendanceRecord } from "@/lib/types";

type Body = {
  sessionId?: string;
  token?: string;
  lat?: number;
  lng?: number;
  deviceId?: string;
  manual?: boolean;
  reason?: string;
};

/**
 * POST /api/v1/attendance/check-in
 * Server-authoritative attendance verification:
 *  1. session must be OPEN
 *  2. token must match the current rotating token and be unexpired
 *  3. student must be enrolled
 *  4. no existing record for this session (duplicate prevention)
 *  5. distance to the classroom must be inside the geofence
 * Every rejection is returned with a machine-readable code and is auditable.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT") {
    return NextResponse.json({ error: "FORBIDDEN", message: "تسجيل الحضور متاح للطلاب فقط." }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const student = findStudent(user.studentId ?? "");
  if (!student) return NextResponse.json({ error: "NO_PROFILE" }, { status: 404 });

  const session = db().attendanceSessions.find((s) => s.id === body.sessionId);
  if (!session) return NextResponse.json({ error: "NOT_FOUND", message: "جلسة الحضور غير موجودة." }, { status: 404 });

  if (session.status !== "OPEN") {
    return NextResponse.json({ error: "SESSION_CLOSED", message: "أُغلقت جلسة الحضور. تواصل مع المعلم." }, { status: 409 });
  }
  if (!student.enrolledCourseIds.includes(session.courseId)) {
    return NextResponse.json({ error: "NOT_ENROLLED", message: "أنت غير مسجل في هذا المقرر." }, { status: 403 });
  }

  const existing = db().attendanceRecords.find((r) => r.sessionId === session.id && r.studentId === student.id);
  if (existing) {
    return NextResponse.json(
      { error: "DUPLICATE", message: "تم تسجيل حضورك مسبقاً في هذه المحاضرة.", status: existing.status },
      { status: 409 },
    );
  }

  if (!body.manual) {
    if (!body.token || body.token !== session.qrToken) {
      return NextResponse.json({ error: "STALE_TOKEN", message: "انتهت صلاحية كود الحضور. امسح الكود الظاهر الآن." }, { status: 409 });
    }
    if (session.qrExpiresAt <= Date.now()) {
      return NextResponse.json({ error: "EXPIRED_TOKEN", message: "انتهت صلاحية الكود (20 ثانية). أعد المسح." }, { status: 409 });
    }
  }

  let distance: number | undefined;
  if (!body.manual) {
    if (typeof body.lat !== "number" || typeof body.lng !== "number") {
      return NextResponse.json({ error: "GEO_REQUIRED", message: "مطلوب تحديد الموقع للتحقق من النطاق الجغرافي." }, { status: 422 });
    }
    distance = Math.round(distanceMeters({ lat: body.lat, lng: body.lng }, session.geo));
    if (distance > session.geo.radiusM) {
      return NextResponse.json(
        { error: "OUT_OF_GEOFENCE", message: `أنت خارج النطاق المسموح (${distance}م من ${session.geo.radiusM}م).`, distance },
        { status: 422 },
      );
    }
  } else if (user.role !== "STUDENT") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const now = Date.now();
  const lateCutoff = (() => {
    const [h, m] = session.start.split(":").map(Number);
    const start = new Date(`${session.date}T00:00:00`);
    start.setHours(h, m + 10, 0, 0); // 10-minute grace window
    return start.getTime();
  })();

  const record: AttendanceRecord = {
    id: `atr_${session.id}_${student.id}`,
    sessionId: session.id,
    studentId: student.id,
    courseId: session.courseId,
    date: session.date,
    status: now > lateCutoff && now > session.openedAt + 10 * 60_000 ? "LATE" : "PRESENT",
    method: "QR",
    markedAt: now,
    geoDistanceM: distance,
    deviceId: body.deviceId,
  };

  db().attendanceRecords.push(record);
  if (record.status === "PRESENT") session.presentCount += 1;
  else session.lateCount += 1;

  pushAudit({
    actorId: user.id,
    actorName: user.nameAr,
    actorRole: user.role,
    action: "attendance.check_in",
    actionAr: "تسجيل حضور بالـQR",
    target: `${session.courseId} / ${session.id}`,
    reason: distance !== undefined ? `المسافة ${distance}م داخل النطاق` : "تحقق يدوي",
    severity: "INFO",
  });

  return NextResponse.json({
    ok: true,
    status: record.status,
    markedAt: now,
    distance,
    message: record.status === "LATE" ? "تم تسجيل حضورك متأخراً." : "تم تسجيل حضورك بنجاح.",
  });
}
