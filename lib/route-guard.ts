import type { Role } from "./types";

/**
 * Pure routing helpers shared by the Edge middleware and the server guards.
 * No Node APIs here — `middleware.ts` can import it safely.
 */

export const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/student",
  TEACHER: "/teacher",
  INSTITUTION_ADMIN: "/admin",
  EXAM_SUPERVISOR: "/admin/exam-control",
  SUPER_ADMIN: "/admin",
};

/** Path prefixes each role is allowed to land on after sign-in. */
export const ROLE_PATH_PREFIX: Record<Role, string[]> = {
  STUDENT: ["/student", "/exam"],
  TEACHER: ["/teacher"],
  INSTITUTION_ADMIN: ["/admin"],
  SUPER_ADMIN: ["/admin"],
  EXAM_SUPERVISOR: ["/admin"],
};

export function isRole(value: string | null | undefined): value is Role {
  return !!value && value in ROLE_HOME;
}

/** Only same-origin, absolute-path values are accepted — no `//host`, no schemes. */
export function isSafePath(value: string | null | undefined): value is string {
  if (!value) return false;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return false;
  if (path.length > 300) return false;
  return !/[\r\n]/.test(path);
}

/** Keeps a deep link only when it stays inside the signed-in role's own area. */
export function safeNextForRole(value: string | null | undefined, role: Role): string | null {
  if (!isSafePath(value)) return null;
  const path = value.trim();
  return ROLE_PATH_PREFIX[role].some(
    (p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`),
  )
    ? path
    : null;
}

export function homeForRole(value: string | null | undefined): string {
  return isRole(value) ? ROLE_HOME[value] : "/";
}
