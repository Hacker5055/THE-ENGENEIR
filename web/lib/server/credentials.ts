import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing shared by the seed bootstrap and by accounts created at
 * runtime (admin adds a student/teacher). scrypt with a per-password salt —
 * nothing is ever stored in plain text.
 */
export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(key, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/** Role-based demo passwords — documented in the README. */
export const ROLE_PASSWORD = {
  STUDENT: "Student@123",
  TEACHER: "Teacher@123",
  EXAM_SUPERVISOR: "Super@123",
  INSTITUTION_ADMIN: "Admin@123",
  SUPER_ADMIN: "Root@123",
} as const;
