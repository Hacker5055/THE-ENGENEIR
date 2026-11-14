import "server-only";
import { db, notify, pushAudit } from "./store";
import { ROLE_PASSWORD, hashPassword } from "./credentials";
import type { SessionUser, Student, Teacher } from "@/lib/types";

/**
 * Registry writes: creating a student or a teacher.
 *
 * Shared by the admin UI (Server Action) and the REST API, so both paths run
 * exactly the same validation, account creation, notification and audit entry.
 * A record created here can sign in immediately — it is not a decorative row.
 */

export type CreateStudentInput = {
  nameAr: string;
  nameEn: string;
  departmentId: string;
  level: number;
  phone?: string;
  nationalId?: string;
};

export type CreateTeacherInput = {
  nameAr: string;
  nameEn: string;
  title?: string;
  departmentId: string;
  email: string;
  courseIds?: string[];
};

export type RegistryResult =
  | { ok: true; number: string; email: string; password: string; id: string }
  | { ok: false; error: string };

const digits = (n: number) => String(n).padStart(4, "0");
const hueFor = (name: string) => (name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 7) % 360;

function nextStudentNumber(year = new Date().getFullYear()): string {
  const used = new Set(db().students.map((s) => s.studentNumber));
  for (let i = 1; i < 10_000; i++) {
    const candidate = `AM${year}${digits(1000 + i).slice(-4)}`;
    if (!used.has(candidate)) return candidate;
  }
  return `AM${year}${digits(Math.floor(Math.random() * 9999))}`;
}

export function createStudentRecord(actor: SessionUser, input: CreateStudentInput): RegistryResult {
  const nameAr = input.nameAr.trim();
  const nameEn = input.nameEn.trim();
  const departmentId = input.departmentId;
  const level = ([1, 2, 3, 4].includes(input.level) ? input.level : 1) as 1 | 2 | 3 | 4;
  const phone = (input.phone ?? "").trim();
  const nationalId = (input.nationalId ?? "").replace(/\D/g, "");

  if (nameAr.length < 3) return { ok: false, error: "الاسم بالعربية مطلوب (3 أحرف على الأقل)." };
  if (nameEn.length < 3) return { ok: false, error: "Name in English is required (at least 3 characters)." };
  if (!db().departments.some((d) => d.id === departmentId)) return { ok: false, error: "اختر القسم الأكاديمي." };
  if (nationalId && nationalId.length !== 14) return { ok: false, error: "الرقم القومي 14 رقماً." };
  if (phone && phone !== "—" && !/^0?1[0-9]{9}$/.test(phone.replace(/\s/g, ""))) {
    return { ok: false, error: "رقم الهاتف غير صحيح." };
  }

  const studentNumber = nextStudentNumber();
  const email = `${studentNumber.toLowerCase()}@almohandes.edu`;
  if (db().users.some((u) => u.email.toLowerCase() === email)) {
    return { ok: false, error: "تعذّر توليد بريد فريد — أعد المحاولة." };
  }

  const section = db().sections.find((s) => s.departmentId === departmentId && s.level === level) ?? db().sections[0];
  const enrolled = db()
    .courses.filter((c) => c.departmentId === departmentId && c.level === level)
    .slice(0, 6)
    .map((c) => c.id);
  const advisor = db().teachers.find((t) => t.departmentId === departmentId) ?? db().teachers[0];

  const id = `stu_${studentNumber.toLowerCase()}`;
  const record: Student = {
    id,
    institutionId: actor.institutionId ?? "inst_main",
    nameAr,
    nameEn,
    studentNumber,
    email,
    phone: phone || "—",
    departmentId,
    level,
    sectionId: section?.id ?? "sec_cs3a",
    academicStatus: "ACTIVE",
    gpa: 0,
    attendanceRate: 100,
    credits: 0,
    enrolledCourseIds: enrolled,
    advisorId: advisor?.id ?? "tch_01",
    joinedAt: new Date().toISOString(),
    nationalIdMasked: nationalId ? `${nationalId.slice(0, 4)}••••••${nationalId.slice(-4)}` : "—",
    avatarHue: hueFor(nameAr),
    birthDate: "2006-01-01",
    address: "—",
    riskBand: "LOW",
  };
  db().students.unshift(record);

  db().users.push({
    id: `usr_${id}`,
    nameAr,
    nameEn,
    role: "STUDENT",
    email,
    institutionId: record.institutionId,
    studentId: id,
    avatarHue: hueFor(nameAr),
    title: `طالب — المستوى ${level}`,
    passwordHash: hashPassword(ROLE_PASSWORD.STUDENT),
  });

  notify({
    userId: id,
    role: "STUDENT",
    category: "ADMIN",
    titleAr: "تم إنشاء حسابك الجامعي",
    titleEn: "Your university account was created",
    bodyAr: `مرحباً ${nameAr}، حسابك ${studentNumber} صار جاهزاً. سجّل الدخول ببريدك المؤسسي ${email}.`,
    bodyEn: `Welcome ${nameAr}. Your account ${studentNumber} is ready — sign in with ${email}.`,
    href: "/student",
  });

  pushAudit({
    actorId: actor.id,
    actorName: actor.nameAr,
    actorRole: actor.role,
    action: "student.create",
    actionAr: "إضافة طالب إلى السجل",
    target: `${studentNumber} · ${nameAr}`,
    ip: "197.44.12.9",
    severity: "WARNING",
  });

  return { ok: true, number: studentNumber, email, password: ROLE_PASSWORD.STUDENT, id };
}

export function createTeacherRecord(actor: SessionUser, input: CreateTeacherInput): RegistryResult {
  const nameAr = input.nameAr.trim();
  const nameEn = input.nameEn.trim();
  const title = (input.title ?? "").trim() || "عضو هيئة تدريس";
  const departmentId = input.departmentId;
  const email = input.email.trim().toLowerCase();
  const courseIds = (input.courseIds ?? []).filter(Boolean);

  if (nameAr.length < 3) return { ok: false, error: "الاسم بالعربية مطلوب (3 أحرف على الأقل)." };
  if (nameEn.length < 3) return { ok: false, error: "Name in English is required (at least 3 characters)." };
  if (!db().departments.some((d) => d.id === departmentId)) return { ok: false, error: "اختر القسم الأكاديمي." };
  if (!/^[^\s@]+@almohandes\.edu$/.test(email)) return { ok: false, error: "استخدم بريداً مؤسسياً ينتهي بـ @almohandes.edu." };
  if (db().users.some((u) => u.email.toLowerCase() === email)) return { ok: false, error: "هذا البريد مستخدم بالفعل." };

  const id = `tch_${Date.now().toString(36)}`;
  const record: Teacher = {
    id,
    institutionId: actor.institutionId ?? "inst_main",
    nameAr,
    nameEn,
    title,
    email,
    phone: "—",
    departmentId,
    courseIds,
    officeRoom: "—",
    officeHours: "—",
    joinedAt: new Date().toISOString(),
    rating: 0,
    status: "ACTIVE",
  };
  db().teachers.unshift(record);

  db().users.push({
    id: `usr_${id}`,
    nameAr,
    nameEn,
    role: "TEACHER",
    email,
    institutionId: record.institutionId,
    teacherId: id,
    avatarHue: hueFor(nameAr),
    title,
    passwordHash: hashPassword(ROLE_PASSWORD.TEACHER),
  });

  // Newly assigned courses point at the new owner immediately.
  for (const courseId of courseIds) {
    const course = db().courses.find((c) => c.id === courseId);
    if (course) course.teacherId = id;
  }

  notify({
    userId: `usr_${id}`,
    role: "TEACHER",
    category: "ADMIN",
    titleAr: "تم إنشاء حساب عضو هيئة التدريس",
    titleEn: "Teaching account created",
    bodyAr: `مرحباً ${nameAr}، حسابك جاهز على ${email}.`,
    bodyEn: `Welcome ${nameAr}. Your account is ready — ${email}.`,
    href: "/teacher",
  });

  pushAudit({
    actorId: actor.id,
    actorName: actor.nameAr,
    actorRole: actor.role,
    action: "teacher.create",
    actionAr: "إضافة عضو هيئة تدريس",
    target: `${nameAr} · ${email}`,
    ip: "197.44.12.9",
    severity: "WARNING",
  });

  return { ok: true, number: id, email, password: ROLE_PASSWORD.TEACHER, id };
}
