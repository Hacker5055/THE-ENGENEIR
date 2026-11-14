import type { Permission, Role } from "@/lib/types";

/**
 * Single permission matrix shared by the server guard, the API, and the UI.
 * The UI only uses it to *hide* navigation — every mutation re-checks it on the
 * server (see lib/server/auth.ts → requirePermission / assertPermission).
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "institution.manage", "institution.view_all", "user.manage", "student.view_all", "teacher.view_all",
    "academic.manage", "attendance.view_all", "attendance.record", "exam.manage", "exam.monitor",
    "exam.incident.decide", "question.manage", "grade.view_all", "grade.edit", "device.manage",
    "complaint.manage", "notification.manage", "report.export", "audit.view", "role.manage",
    "settings.manage", "self.read",
  ],
  INSTITUTION_ADMIN: [
    "user.manage", "student.view_all", "teacher.view_all", "academic.manage", "attendance.view_all",
    "attendance.record", "exam.manage", "exam.monitor", "exam.incident.decide", "question.manage",
    "grade.view_all", "grade.edit", "device.manage", "complaint.manage", "notification.manage",
    "report.export", "audit.view", "role.manage", "settings.manage", "self.read",
  ],
  EXAM_SUPERVISOR: [
    "exam.monitor", "exam.incident.decide", "attendance.view_all", "student.view_all", "audit.view",
    "report.export", "self.read",
  ],
  TEACHER: ["attendance.record", "exam.manage", "question.manage", "grade.edit", "complaint.manage", "report.export", "self.read"],
  STUDENT: ["self.read"],
};

export const can = (role: Role | undefined, permission: Permission) => (role ? ROLE_PERMISSIONS[role]?.includes(permission) ?? false : false);

export const ROLE_LABEL: Record<Role, { ar: string; en: string }> = {
  SUPER_ADMIN: { ar: "مدير المنصة", en: "Super admin" },
  INSTITUTION_ADMIN: { ar: "مدير المؤسسة", en: "Institution admin" },
  EXAM_SUPERVISOR: { ar: "مراقب الاختبارات", en: "Exam supervisor" },
  TEACHER: { ar: "عضو هيئة تدريس", en: "Teacher" },
  STUDENT: { ar: "طالب", en: "Student" },
};
