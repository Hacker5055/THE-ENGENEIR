/* ============================================================================
   First-run bootstrap (production)
   ----------------------------------------------------------------------------
   A production instance starts **empty**: one institution, one academic year,
   one open semester, the role catalogue, default settings and a single
   SUPER_ADMIN created from environment variables.

   There are no demo accounts, no demo passwords and no seeded people. If the
   admin variables are missing the process refuses to start rather than
   inventing credentials.
   ========================================================================== */

import "server-only";
import type { AcademicYear, Institution, RoleDefinition, Semester } from "@/lib/types";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import type { Database, InstitutionSettings } from "./seed";
import { hashPassword } from "./credentials";

export class BootstrapError extends Error {}

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  SUPER_ADMIN: { ar: "مدير المنصة", en: "Super admin" },
  INSTITUTION_ADMIN: { ar: "مدير المؤسسة", en: "Institution admin" },
  EXAM_SUPERVISOR: { ar: "مراقب اختبارات", en: "Exam supervisor" },
  TEACHER: { ar: "عضو هيئة تدريس", en: "Teacher" },
  STUDENT: { ar: "طالب", en: "Student" },
};

export function defaultSettings(overrides: Partial<InstitutionSettings> = {}): InstitutionSettings {
  return {
    nameAr: "المؤسسة",
    nameEn: "Institution",
    domain: "example.edu",
    timezone: "Africa/Cairo",
    attendanceWarningPct: 25,
    examRetentionYears: 5,
    geofenceRadiusM: 150,
    requireTwoFactor: false,
    requireDeviceBinding: false,
    notifyAbsence: true,
    allowPersonalDevices: false,
    ...overrides,
  };
}

export function roleCatalogue(env = process.env): RoleDefinition[] {
  return (Object.keys(ROLE_PERMISSIONS) as (keyof typeof ROLE_PERMISSIONS)[]).map((role) => ({
    role,
    nameAr: ROLE_LABELS[role]?.ar ?? role,
    nameEn: ROLE_LABELS[role]?.en ?? role,
    descriptionAr: "دور نظامي بصلاحيات محددة مسبقاً.",
    descriptionEn: "System role with a predefined permission set.",
    permissions: [...ROLE_PERMISSIONS[role]],
    userCount: role === "SUPER_ADMIN" ? 1 : 0,
    system: true,
  }));
}

export function isStrongPassword(password: string) {
  return (
    password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

/** Throws when a production deployment is missing required configuration. */
export function assertProductionConfig(env: NodeJS.ProcessEnv = process.env) {
  const problems: string[] = [];
  if (!env.AM_ADMIN_EMAIL?.trim()) problems.push("AM_ADMIN_EMAIL");
  const password = env.AM_ADMIN_PASSWORD ?? "";
  if (!password) problems.push("AM_ADMIN_PASSWORD");
  else if (!isStrongPassword(password))
    problems.push("AM_ADMIN_PASSWORD (12+ حرفاً مع حروف كبيرة وصغيرة ورقم ورمز)");
  if (problems.length) {
    throw new BootstrapError(
      `إعداد غير مكتمل — المتغيرات المطلوبة: ${problems.join(", ")}. راجع .env.example ثم أعد التشغيل.`,
    );
  }
}

export function buildProductionDatabase(env: NodeJS.ProcessEnv = process.env): Database {
  assertProductionConfig(env);

  const now = Date.now();
  const year = new Date().getFullYear();
  const email = env.AM_ADMIN_EMAIL!.trim().toLowerCase();
  const nameAr = env.AM_ADMIN_NAME_AR?.trim() || "مدير النظام";
  const nameEn = env.AM_ADMIN_NAME_EN?.trim() || "System administrator";
  const domain = email.split("@")[1] ?? "example.edu";
  const nameArInst = env.AM_INSTITUTION_NAME_AR?.trim() || "المؤسسة";
  const nameEnInst = env.AM_INSTITUTION_NAME_EN?.trim() || "Institution";

  const institution: Institution = {
    id: "inst_main",
    nameAr: nameArInst,
    nameEn: nameEnInst,
    code: env.AM_INSTITUTION_CODE?.trim() || "MAIN",
    city: env.AM_INSTITUTION_CITY?.trim() || "",
    domain,
    students: 0,
    teachers: 0,
    departments: 0,
    plan: "Campus",
    status: "ACTIVE",
  };

  const semester: Semester = {
    id: `sem_${year}_1`,
    yearId: `ay_${year}`,
    nameAr: "الفصل الدراسي الأول",
    nameEn: "First semester",
    startDate: `${year}-09-15`,
    endDate: `${year + 1}-01-15`,
    status: "ACTIVE",
  };

  const academicYear: AcademicYear = {
    id: `ay_${year}`,
    label: `${year} / ${year + 1}`,
    startDate: `${year}-09-15`,
    endDate: `${year + 1}-06-30`,
    status: "ACTIVE",
    semesters: [semester],
  };

  return {
    bootAt: now,
    institutions: [institution],
    departments: [],
    academicYears: [academicYear],
    semesters: [semester],
    sections: [],
    teachers: [],
    students: [],
    courses: [],
    schedule: [],
    attendanceSessions: [],
    attendanceRecords: [],
    questions: [],
    examinations: [],
    attempts: [],
    examEvents: [],
    devices: [],
    grades: [],
    notifications: [],
    complaints: [],
    auditLogs: [],
    roles: roleCatalogue(env),
    users: [
      {
        id: "usr_root",
        nameAr,
        nameEn,
        role: "SUPER_ADMIN",
        email,
        institutionId: institution.id,
        avatarHue: 300,
        title: "مدير المنصة",
        passwordHash: hashPassword(env.AM_ADMIN_PASSWORD!),
        passwordChangedAt: now,
        mustChangePassword: env.AM_ADMIN_FORCE_PASSWORD_CHANGE === "1",
      },
    ],
    lectureNotes: [],
    settings: defaultSettings({
      nameAr: nameArInst,
      nameEn: nameEnInst,
      domain,
      timezone: env.AM_TIMEZONE?.trim() || "Africa/Cairo",
    }),
    studentPrefs: {},
  } as Database;
}
