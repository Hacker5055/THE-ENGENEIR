"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/server/auth";
import { db, findAttempt, findExam, findStudent, notify, pushAudit } from "@/lib/server/store";
import { createStudentRecord, createTeacherRecord } from "@/lib/server/registry";
import { gradeAttempt, recordEvent } from "@/lib/server/exam";
import type { ComplaintStatus, ExamEventType } from "@/lib/types";

const SUPERVISOR_ROLES = ["EXAM_SUPERVISOR", "INSTITUTION_ADMIN", "SUPER_ADMIN"] as const;

/**
 * Supervisor decision on a flagged / locked attempt.
 *
 * Every branch writes an immutable-looking audit trail entry plus an exam event
 * carrying the reason the supervisor typed. Nothing here happens automatically:
 * the platform never voids an attempt on its own.
 */
export async function supervisorDecision(formData: FormData) {
  const user = await requireRole([...SUPERVISOR_ROLES]);
  const attemptId = String(formData.get("attemptId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 600);
  const minutes = Math.max(1, Math.min(60, Number(formData.get("minutes") ?? 5)));
  const attempt = findAttempt(attemptId);
  if (!attempt) redirect("/admin/exam-control?error=notfound");
  const exam = findExam(attempt.examinationId);
  const student = findStudent(attempt.studentId);
  if (!exam) redirect("/admin/exam-control?error=notfound");

  if (reason.length < 4) {
    redirect(`/admin/exam-control/${attemptId}?error=reason`);
  }

  const nameAr = user.nameAr;
  const notifyStudent = (titleAr: string, titleEn: string, bodyAr: string, bodyEn: string) =>
    notify({
      userId: attempt.studentId,
      role: "STUDENT",
      category: "EXAM",
      titleAr,
      titleEn,
      bodyAr,
      bodyEn,
      href: `/student/exams/${exam.id}`,
      priority: "HIGH",
    });

  let label = "";
  let logAction = "";

  switch (decision) {
    case "RESUME": {
      attempt.status = "IN_PROGRESS";
      attempt.endsAt = Math.max(attempt.endsAt ?? 0, Date.now()) + minutes * 60_000;
      attempt.extraTimeMin = (attempt.extraTimeMin ?? 0) + minutes;
      attempt.lastHeartbeat = Date.now();
      label = "استئناف المحاولة";
      logAction = "supervisor.resume";
      recordEvent(attempt, "SESSION_RESUMED", {
        ar: `أعاد المراقب ${nameAr} تفعيل المحاولة مع ${minutes} دقيقة إضافية. السبب: ${reason}`,
        en: `Supervisor ${user.nameEn} resumed the attempt with ${minutes} extra minutes. Reason: ${reason}`,
      }, { actor: user });
      notifyStudent(
        "تم استئناف محاولتك",
        "Your attempt was resumed",
        `أعاد المراقب تفعيل محاولتك في «${exam.titleAr}» مع ${minutes} دقيقة إضافية.`,
        `A supervisor resumed your attempt in “${exam.titleEn}” with ${minutes} extra minutes.`,
      );
      break;
    }
    case "ADD_TIME": {
      attempt.endsAt = (attempt.endsAt ?? Date.now()) + minutes * 60_000;
      attempt.extraTimeMin = (attempt.extraTimeMin ?? 0) + minutes;
      label = `منح ${minutes} دقيقة إضافية`;
      logAction = "supervisor.add_time";
      recordEvent(attempt, "TIME_EXTENDED", {
        ar: `منح المراقب ${nameAr} ${minutes} دقيقة إضافية. السبب: ${reason}`,
        en: `Supervisor ${user.nameEn} granted ${minutes} extra minutes. Reason: ${reason}`,
      }, { actor: user });
      notifyStudent(
        "وقت إضافي معتمد",
        "Extra time granted",
        `أُضيفت ${minutes} دقيقة إلى محاولتك في «${exam.titleAr}».`,
        `${minutes} minutes were added to your attempt in “${exam.titleEn}”.`,
      );
      break;
    }
    case "APPROVE": {
      attempt.submittedAt = attempt.submittedAt ?? Date.now();
      attempt.status = "SUBMITTED";
      const { score, pendingManual } = gradeAttempt(attempt);
      attempt.score = score;
      attempt.passed = score >= exam.passingMarks;
      attempt.status = pendingManual > 0 ? "SUBMITTED" : "GRADED";
      attempt.gradedAt = attempt.status === "GRADED" ? Date.now() : attempt.gradedAt;
      label = "اعتماد التسليم وتجاهل التعليق";
      logAction = "supervisor.approve";
      recordEvent(attempt, "EXAM_SUBMITTED", {
        ar: `اعتمد المراقب ${nameAr} تسليم المحاولة رغم الحوادث. السبب: ${reason}`,
        en: `Supervisor ${user.nameEn} accepted the submission despite incidents. Reason: ${reason}`,
      }, { actor: user });
      notifyStudent(
        "اعتُمد تسليمك",
        "Your submission was accepted",
        `اعتمد المراقب تسليمك في «${exam.titleAr}». النتيجة ${score} من ${exam.totalMarks}.`,
        `A supervisor accepted your submission in “${exam.titleEn}”. Score ${score} of ${exam.totalMarks}.`,
      );
      break;
    }
    case "VOID": {
      attempt.status = "CANCELLED";
      attempt.score = 0;
      attempt.passed = false;
      label = "إلغاء المحاولة";
      logAction = "supervisor.void";
      recordEvent(attempt, "ATTEMPT_CANCELLED", {
        ar: `ألغى المراقب ${nameAr} المحاولة بعد مراجعة الحوادث. السبب: ${reason}`,
        en: `Supervisor ${user.nameEn} voided the attempt after incident review. Reason: ${reason}`,
      }, { actor: user, severity: "CRITICAL" });
      notifyStudent(
        "أُلغيت المحاولة بعد المراجعة",
        "Attempt voided after review",
        `أُلغيت محاولتك في «${exam.titleAr}» بعد مراجعة بشرية. يمكنك تقديم استئناف من التطبيق. السبب: ${reason}`,
        `Your attempt in “${exam.titleEn}” was voided after human review. You can appeal from the app. Reason: ${reason}`,
      );
      break;
    }
    case "CLEAR": {
      attempt.violations = 0;
      attempt.status = "IN_PROGRESS";
      attempt.endsAt = Math.max(attempt.endsAt ?? 0, Date.now()) + minutes * 60_000;
      attempt.lastHeartbeat = Date.now();
      label = "رفع التعليق وتصفير الحوادث";
      logAction = "supervisor.clear_flag";
      recordEvent(attempt, "SESSION_RESUMED", {
        ar: `رفع المراقب ${nameAr} التعليق عن المحاولة وصفّر عدّاد الحوادث. السبب: ${reason}`,
        en: `Supervisor ${user.nameEn} cleared the flag and reset the violation counter. Reason: ${reason}`,
      }, { actor: user });
      notifyStudent(
        "رُفع التعليق عن محاولتك",
        "Flag cleared from your attempt",
        `راجع المراقب الحوادث ورفع التعليق عن محاولتك في «${exam.titleAr}».`,
        `A supervisor reviewed the incidents and cleared the flag on your attempt in “${exam.titleEn}”.`,
      );
      break;
    }
    case "REQUEST_STATEMENT": {
      label = "طلب إفادة من الطالب";
      logAction = "supervisor.request_statement";
      attempt.status = attempt.status === "IN_PROGRESS" ? "FLAGGED" : attempt.status;
      recordEvent(attempt, "SUPERVISOR_DECISION", {
        ar: `طلب المراقب ${nameAr} إفادة مكتوبة من الطالب. السبب: ${reason}`,
        en: `Supervisor ${user.nameEn} requested a written statement from the student. Reason: ${reason}`,
      }, { actor: user });
      notifyStudent(
        "طلب إفادة بخصوص الاختبار",
        "Statement requested for your examination",
        `طلب المراقب إفادة مكتوبة حول ما رُصد في «${exam.titleAr}». يمكنك الرد من صفحة الطلبات.`,
        `A supervisor requested a written statement about what was detected in “${exam.titleEn}”. Reply from your requests page.`,
      );
      break;
    }
    default:
      redirect(`/admin/exam-control/${attemptId}?error=decision`);
  }

  pushAudit({
    actorId: user.id,
    actorName: nameAr,
    actorRole: user.role,
    action: logAction,
    actionAr: label,
    target: `${exam.code} · ${student?.studentNumber ?? attempt.studentId}`,
    reason,
    ip: "197.44.12.9",
    severity: decision === "VOID" ? "CRITICAL" : "WARNING",
  });

  revalidatePath("/admin/exam-control");
  revalidatePath(`/admin/exam-control/${attemptId}`);
  revalidatePath(`/teacher/exams/${exam.id}`);
  revalidatePath("/admin/audit");
}

/* ----------------------------- complaints ----------------------------- */

export async function staffReplyComplaint(formData: FormData) {
  const user = await requireUser();
  if (!["INSTITUTION_ADMIN", "SUPER_ADMIN", "EXAM_SUPERVISOR"].includes(user.role)) {
    await requireRole(["INSTITUTION_ADMIN"]);
  }
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  const internal = formData.get("internal") === "on";
  const status = String(formData.get("status") ?? "") as ComplaintStatus | "";
  const complaint = db().complaints.find((c) => c.id === id);
  if (!complaint) redirect("/admin/complaints?error=notfound");
  if (body.length < 3) redirect(`/admin/complaints/${id}?error=body`);

  complaint.messages.push({
    id: `msg_${Date.now().toString(36)}`,
    authorId: user.id,
    authorRole: user.role,
    authorName: user.nameAr,
    body,
    createdAt: Date.now(),
    internal,
  });
  complaint.updatedAt = Date.now();
  if (status) complaint.status = status;

  if (!internal) {
    notify({
      userId: complaint.studentId,
      role: "STUDENT",
      category: "COMPLAINT",
      titleAr: `رد جديد على طلبك ${complaint.ticket}`,
      titleEn: `New reply on your request ${complaint.ticket}`,
      bodyAr: body.slice(0, 120),
      bodyEn: body.slice(0, 120),
      href: `/student/complaints/${complaint.id}`,
      priority: "HIGH",
    });
  }

  pushAudit({
    actorId: user.id,
    actorName: user.nameAr,
    actorRole: user.role,
    action: internal ? "complaint.note" : "complaint.reply",
    actionAr: internal ? "ملاحظة داخلية على طلب" : "رد على طلب طالب",
    target: complaint.ticket,
    ip: "197.44.12.9",
    severity: "INFO",
  });

  revalidatePath(`/admin/complaints/${id}`);
  revalidatePath("/admin/complaints");
}

export async function resolveComplaint(formData: FormData) {
  const user = await requireUser();
  if (!["INSTITUTION_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    await requireRole(["INSTITUTION_ADMIN"]);
  }
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "RESOLVED") as ComplaintStatus;
  const resolution = String(formData.get("resolution") ?? "").trim().slice(0, 1000);
  const complaint = db().complaints.find((c) => c.id === id);
  if (!complaint) redirect("/admin/complaints?error=notfound");
  if (resolution.length < 5) redirect(`/admin/complaints/${id}?error=resolution`);

  complaint.status = decision;
  complaint.resolution = resolution;
  complaint.updatedAt = Date.now();

  notify({
    userId: complaint.studentId,
    role: "STUDENT",
    category: "COMPLAINT",
    titleAr: decision === "RESOLVED" ? `تم حل الطلب ${complaint.ticket}` : `تم رفض الطلب ${complaint.ticket}`,
    titleEn: decision === "RESOLVED" ? `Request ${complaint.ticket} resolved` : `Request ${complaint.ticket} rejected`,
    bodyAr: resolution,
    bodyEn: resolution,
    href: `/student/complaints/${complaint.id}`,
    priority: "HIGH",
  });

  pushAudit({
    actorId: user.id,
    actorName: user.nameAr,
    actorRole: user.role,
    action: decision === "RESOLVED" ? "complaint.resolve" : "complaint.reject",
    actionAr: decision === "RESOLVED" ? "إغلاق طلب بقرار" : "رفض طلب",
    target: complaint.ticket,
    reason: resolution,
    ip: "197.44.12.9",
    severity: "WARNING",
  });

  revalidatePath(`/admin/complaints/${id}`);
  revalidatePath("/admin/complaints");
  revalidatePath("/admin");
}

/* ------------------------------- devices ------------------------------- */

export async function setDeviceTrust(formData: FormData) {
  const user = await requireRole(["INSTITUTION_ADMIN", "SUPER_ADMIN"]);
  const deviceId = String(formData.get("deviceId") ?? "");
  const op = String(formData.get("op") ?? "");
  const device = db().devices.find((d) => d.id === deviceId);
  if (!device) redirect("/admin/devices?error=notfound");

  if (op === "trust") {
    device.trusted = true;
    device.status = "ACTIVE";
  } else if (op === "revoke") {
    device.trusted = false;
    device.status = "REVOKED";
  }

  pushAudit({
    actorId: user.id,
    actorName: user.nameAr,
    actorRole: user.role,
    action: op === "trust" ? "device.trust" : "device.revoke",
    actionAr: op === "trust" ? "اعتماد جهاز" : "إلغاء اعتماد جهاز",
    target: device.id,
    ip: "197.44.12.9",
    severity: "WARNING",
  });

  revalidatePath("/admin/devices");
}

/* --------------------------- notifications ---------------------------- */

export async function broadcastNotification(formData: FormData) {
  const user = await requireRole(["INSTITUTION_ADMIN", "SUPER_ADMIN"]);
  const titleAr = String(formData.get("titleAr") ?? "").trim().slice(0, 140);
  const bodyAr = String(formData.get("bodyAr") ?? "").trim().slice(0, 600);
  const audience = String(formData.get("audience") ?? "ALL");
  if (titleAr.length < 3 || bodyAr.length < 5) redirect("/admin/notifications?error=invalid");

  const targets = db().users.filter((u) =>
    audience === "ALL" ? true : audience === "STUDENTS" ? u.role === "STUDENT" : audience === "TEACHERS" ? u.role === "TEACHER" : u.role === "STUDENT" || u.role === "TEACHER",
  );

  targets.forEach((t) => {
    db().notifications.unshift({
      id: `ntf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      userId: t.id,
      audienceRole: t.role,
      category: "ANNOUNCEMENT",
      titleAr,
      titleEn: String(formData.get("titleEn") ?? "").trim() || titleAr,
      bodyAr,
      bodyEn: String(formData.get("bodyEn") ?? "").trim() || bodyAr,
      createdAt: Date.now(),
      read: false,
      priority: formData.get("priority") === "on" ? "HIGH" : "NORMAL",
    });
  });

  pushAudit({
    actorId: user.id,
    actorName: user.nameAr,
    actorRole: user.role,
    action: "notification.broadcast",
    actionAr: "إرسال تعميم",
    target: `${audience} · ${targets.length} recipients`,
    ip: "197.44.12.9",
    severity: "INFO",
  });

  revalidatePath("/admin/notifications");
}

export async function markAdminNotificationsRead() {
  const user = await requireUser();
  db().notifications.forEach((n) => {
    if (n.userId === user.id) n.read = true;
  });
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
}

/* --------------------------- institutions ----------------------------- */

export async function updateInstitutionStatus(formData: FormData) {
  const user = await requireRole(["SUPER_ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "ACTIVE") as "ACTIVE" | "TRIAL" | "SUSPENDED";
  const inst = db().institutions.find((i) => i.id === id);
  if (!inst) redirect("/admin/institutions?error=notfound");
  inst.status = status;
  pushAudit({
    actorId: user.id,
    actorName: user.nameAr,
    actorRole: user.role,
    action: "institution.status",
    actionAr: "تغيير حالة مؤسسة",
    target: `${inst.code} → ${status}`,
    ip: "197.44.12.9",
    severity: "CRITICAL",
  });
  revalidatePath("/admin/institutions");
}

/* ------------------------------ students ------------------------------ */

export async function updateStudentStanding(formData: FormData) {
  const user = await requireRole(["INSTITUTION_ADMIN", "SUPER_ADMIN"]);
  const studentId = String(formData.get("studentId") ?? "");
  const status = String(formData.get("status") ?? "ACTIVE") as "ACTIVE" | "PROBATION" | "SUSPENDED" | "GRADUATED";
  const student = findStudent(studentId);
  if (!student) redirect("/admin/students?error=notfound");
  const previous = student.academicStatus;
  student.academicStatus = status;

  notify({
    userId: studentId,
    role: "STUDENT",
    category: "ADMIN",
    titleAr: "تحديث حالتك الأكاديمية",
    titleEn: "Your academic standing changed",
    bodyAr: `تم تحديث حالتك من ${previous} إلى ${status} بقرار إداري.`,
    bodyEn: `Your standing changed from ${previous} to ${status} by an administrative decision.`,
    href: "/student/profile",
  });

  pushAudit({
    actorId: user.id,
    actorName: user.nameAr,
    actorRole: user.role,
    action: "student.standing",
    actionAr: "تعديل الحالة الأكاديمية",
    target: `${student.studentNumber}: ${previous} → ${status}`,
    ip: "197.44.12.9",
    severity: "WARNING",
  });

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
}

/* -------------------------- exam control helpers ----------------------- */

export async function injectExamEvent(formData: FormData) {
  const user = await requireRole([...SUPERVISOR_ROLES]);
  const attemptId = String(formData.get("attemptId") ?? "");
  const type = String(formData.get("type") ?? "SUPERVISOR_DECISION") as ExamEventType;
  const detail = String(formData.get("detail") ?? "").trim().slice(0, 300);
  const attempt = findAttempt(attemptId);
  if (!attempt || detail.length < 4) redirect(`/admin/exam-control/${attemptId}?error=detail`);
  recordEvent(attempt, type, { ar: `${detail} — ${user.nameAr}`, en: `${detail} — ${user.nameEn}` }, { actor: user });
  pushAudit({
    actorId: user.id,
    actorName: user.nameAr,
    actorRole: user.role,
    action: "exam.event",
    actionAr: "تسجيل ملاحظة مراقبة",
    target: attemptId,
    reason: detail,
    ip: "197.44.12.9",
    severity: "INFO",
  });
  revalidatePath(`/admin/exam-control/${attemptId}`);
}

/* ------------------------------- settings ------------------------------ */

export async function saveInstitutionSettings(formData: FormData) {
  const user = await requireRole(["INSTITUTION_ADMIN", "SUPER_ADMIN"]);
  const s = db().settings;
  const str = (k: string, fallback: string) => String(formData.get(k) ?? "").trim() || fallback;
  const num = (k: string, fallback: number, min: number, max: number) => {
    const v = Number(formData.get(k));
    return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
  };

  s.nameAr = str("nameAr", s.nameAr);
  s.nameEn = str("nameEn", s.nameEn);
  s.domain = str("domain", s.domain);
  s.timezone = str("timezone", s.timezone);
  s.attendanceWarningPct = num("attendanceWarningPct", s.attendanceWarningPct, 5, 50);
  s.examRetentionYears = num("examRetentionYears", s.examRetentionYears, 1, 10);
  s.geofenceRadiusM = num("geofenceRadiusM", s.geofenceRadiusM, 25, 500);
  s.requireTwoFactor = formData.get("requireTwoFactor") === "on";
  s.requireDeviceBinding = formData.get("requireDeviceBinding") === "on";
  s.notifyAbsence = formData.get("notifyAbsence") === "on";
  s.allowPersonalDevices = formData.get("allowPersonalDevices") === "on";

  pushAudit({
    actorId: user.id,
    actorName: user.nameAr,
    actorRole: user.role,
    action: "settings.update",
    actionAr: "تحديث إعدادات المؤسسة",
    target: `${s.domain} · 2FA ${s.requireTwoFactor ? "on" : "off"} · geofence ${s.geofenceRadiusM}m`,
    ip: "197.44.12.9",
    severity: "CRITICAL",
  });

  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

/* --------------------------------------------------------------------------
   Registry: create students and teachers (thin wrappers over lib/server/registry)
   -------------------------------------------------------------------------- */

export interface RegistryState {
  error?: string;
  ok?: { number: string; email: string; password: string };
}

export async function createStudentAction(_prev: RegistryState, formData: FormData): Promise<RegistryState> {
  const user = await requireRole(["INSTITUTION_ADMIN", "SUPER_ADMIN"]);
  const result = createStudentRecord(user, {
    nameAr: String(formData.get("nameAr") ?? ""),
    nameEn: String(formData.get("nameEn") ?? ""),
    departmentId: String(formData.get("departmentId") ?? ""),
    level: Number(formData.get("level") ?? 1),
    phone: String(formData.get("phone") ?? ""),
    nationalId: String(formData.get("nationalId") ?? ""),
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/students");
  return { ok: { number: result.number, email: result.email, password: result.password } };
}

export async function createTeacherAction(_prev: RegistryState, formData: FormData): Promise<RegistryState> {
  const user = await requireRole(["INSTITUTION_ADMIN", "SUPER_ADMIN"]);
  const result = createTeacherRecord(user, {
    nameAr: String(formData.get("nameAr") ?? ""),
    nameEn: String(formData.get("nameEn") ?? ""),
    title: String(formData.get("title") ?? ""),
    departmentId: String(formData.get("departmentId") ?? ""),
    email: String(formData.get("email") ?? ""),
    courseIds: formData.getAll("courseIds").map(String),
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/teachers");
  revalidatePath("/admin/courses");
  return { ok: { number: result.number, email: result.email, password: result.password } };
}
