"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/server/auth";
import { db, findCourse, findStudent, notify, pushAudit } from "@/lib/server/store";
import type { ComplaintCategory } from "@/lib/types";

export async function markNotificationsRead() {
  const user = await requireRole(["STUDENT"]);
  db().notifications.forEach((n) => {
    if (n.userId === user.id) n.read = true;
  });
  revalidatePath("/student/notifications");
  revalidatePath("/student");
}

export async function markNotificationRead(formData: FormData) {
  const user = await requireRole(["STUDENT"]);
  const id = String(formData.get("id") ?? "");
  const n = db().notifications.find((x) => x.id === id && x.userId === user.id);
  if (n) n.read = true;
  revalidatePath("/student/notifications");
}

export async function createComplaint(formData: FormData) {
  const user = await requireRole(["STUDENT"]);
  const student = findStudent(user.studentId ?? "");
  if (!student) redirect("/student");

  const category = String(formData.get("category") ?? "GENERAL") as ComplaintCategory;
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 140);
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  const relatedCourseId = String(formData.get("courseId") ?? "") || undefined;
  if (subject.length < 5 || body.length < 10) {
    redirect("/student/complaints/new?error=invalid");
  }

  const prefix = { ATTENDANCE_CORRECTION: "ATT", GRADE_APPEAL: "GRD", EXAM_INCIDENT: "EXM", TECHNICAL: "TEC", GENERAL: "GEN" }[category];
  const seq = String(1000 + db().complaints.length * 7 + Math.floor(Math.random() * 90)).slice(-4);
  const complaint = {
    id: `cmp_${Date.now()}`,
    ticket: `${prefix}-2026-${seq}`,
    studentId: student.id,
    category,
    subject,
    body,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: "OPEN" as const,
    relatedCourseId,
    attachments: [],
    messages: [
      {
        id: `msg_${Date.now()}`,
        authorId: user.id,
        authorRole: "STUDENT" as const,
        authorName: student.nameAr,
        body,
        createdAt: Date.now(),
        internal: false,
      },
    ],
  };
  db().complaints.unshift(complaint);
  notify({
    userId: "usr_admin",
    role: "INSTITUTION_ADMIN",
    category: "COMPLAINT",
    titleAr: "طلب جديد من طالب",
    titleEn: "New student request",
    bodyAr: `${complaint.ticket} — ${subject}`,
    bodyEn: `${complaint.ticket} — ${subject}`,
    href: `/admin/complaints/${complaint.id}`,
    priority: "NORMAL",
  });
  pushAudit({
    actorId: user.id,
    actorName: student.nameAr,
    actorRole: "STUDENT",
    action: "complaint.create",
    actionAr: "إنشاء طلب طلابي",
    target: complaint.ticket,
    severity: "INFO",
  });
  revalidatePath("/student/complaints");
  redirect(`/student/complaints/${complaint.id}?created=1`);
}

export async function replyComplaint(formData: FormData) {
  const user = await requireRole(["STUDENT"]);
  const student = findStudent(user.studentId ?? "");
  const id = String(formData.get("id") ?? "");
  const text = String(formData.get("message") ?? "").trim().slice(0, 2000);
  const complaint = db().complaints.find((c) => c.id === id && c.studentId === student?.id);
  if (!complaint || text.length < 2) redirect(`/student/complaints/${id}`);

  complaint.messages.push({
    id: `msg_${Date.now()}`,
    authorId: user.id,
    authorRole: "STUDENT",
    authorName: student!.nameAr,
    body: text,
    createdAt: Date.now(),
    internal: false,
  });
  complaint.updatedAt = Date.now();
  if (complaint.status === "WAITING_FOR_STUDENT") complaint.status = "UNDER_REVIEW";
  revalidatePath(`/student/complaints/${id}`);
}

export async function revokeDevice(formData: FormData) {
  const user = await requireRole(["STUDENT"]);
  const id = String(formData.get("deviceId") ?? "");
  const device = db().devices.find((d) => d.id === id && d.studentId === user.studentId);
  if (device) {
    device.status = "REVOKED";
    device.trusted = false;
    pushAudit({
      actorId: user.id,
      actorName: user.nameAr,
      actorRole: user.role,
      action: "device.revoke",
      actionAr: "إلغاء جهاز مسجّل",
      target: `${device.label} (${device.id})`,
      severity: "WARNING",
    });
  }
  revalidatePath("/student/security");
}

export async function changePassword(formData: FormData) {
  const user = await requireRole(["STUDENT"]);
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (current.length < 6 || next.length < 10 || next !== confirm) {
    redirect("/student/security?error=password");
  }
  // Prototype note: credential rotation is handled by the NestJS auth service
  // in production (Argon2id + refresh-token family revocation).
  pushAudit({
    actorId: user.id,
    actorName: user.nameAr,
    actorRole: user.role,
    action: "auth.password_change",
    actionAr: "طلب تغيير كلمة المرور",
    target: user.email,
    severity: "WARNING",
  });
  redirect("/student/security?password=queued");
}

export async function updateStudentPrefs(payload: {
  categories: Record<string, boolean>;
  quietHours: boolean;
}): Promise<{ ok: boolean }> {
  const user = await requireRole(["STUDENT"]);
  const studentId = user.studentId ?? "";
  if (!studentId) return { ok: false };

  const categories: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(payload.categories ?? {})) {
    if (/^[A-Z_]{3,24}$/.test(key)) categories[key] = Boolean(value);
  }

  db().studentPrefs[studentId] = {
    categories,
    quietHours: Boolean(payload.quietHours),
    updatedAt: Date.now(),
  };

  pushAudit({
    actorId: user.id,
    actorName: user.nameAr,
    actorRole: "STUDENT",
    action: "prefs.update",
    actionAr: "تحديث تفضيلات الإشعارات",
    target: `student:${studentId}`,
    severity: "INFO",
  });
  revalidatePath("/student/settings");
  revalidatePath("/student/notifications");
  return { ok: true };
}
