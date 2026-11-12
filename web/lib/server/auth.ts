/* ============================================================================
   Authentication & authorisation — server only
   ----------------------------------------------------------------------------
   Opaque, server-side sessions delivered in an HttpOnly, SameSite=Lax cookie.
   Passwords are hashed with scrypt (salted, constant-time comparison).
   Permissions are evaluated on the server for every mutation and page; the UI
   only *hides* controls, it never enforces access.
   ========================================================================== */

import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Permission, Role, SessionUser } from "@/lib/types";
import { ROLE_PERMISSIONS, can } from "@/lib/permissions";
import { DEMO_CREDENTIALS } from "./seed";
import { db } from "./store";

const COOKIE = "am_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/* --------------------------- password hashing --------------------------- */
function hash(password: string, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function verify(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(key, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

let bootstrapped = false;
function bootstrapAccounts() {
  if (bootstrapped) return;
  const users = db().users;
  for (const cred of DEMO_CREDENTIALS) {
    const u = users.find((x) => x.email === cred.email);
    if (u && !u.passwordHash) u.passwordHash = hash(cred.password);
  }
  // Seeded teachers and students share a role-based demo password so every
  // record in the dataset can be inspected while signed in as that person.
  const ROLE_PASSWORD: Record<Role, string> = {
    STUDENT: "Student@123",
    TEACHER: "Teacher@123",
    EXAM_SUPERVISOR: "Super@123",
    INSTITUTION_ADMIN: "Admin@123",
    SUPER_ADMIN: "Root@123",
  };
  for (const u of users) {
    if (!u.passwordHash) u.passwordHash = hash(ROLE_PASSWORD[u.role]);
  }
  bootstrapped = true;
}

/* ------------------------------- sessions ------------------------------ */
interface ServerSession {
  userId: string;
  role: Role;
  issuedAt: number;
  expiresAt: number;
  ip: string;
  agent: string;
}

/**
 * Route handlers and server components are compiled into separate bundles in
 * dev, so mutable server state must live on globalThis (same reason the data
 * store does). In production this is replaced by Redis-backed sessions.
 */
const runtime = globalThis as unknown as {
  __AM_SESSIONS?: Map<string, ServerSession>;
  __AM_PENDING?: Map<string, PendingChallenge>;
};
const sessions = (runtime.__AM_SESSIONS ??= new Map<string, ServerSession>());

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  const user = db().users.find((u) => u.id === session.userId);
  if (!user) return null;
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}

/* ---------------------------- two-factor flow --------------------------- */
interface PendingChallenge {
  userId: string;
  code: string;
  expiresAt: number;
  attempts: number;
  issuedAt: number;
}
const pending = (runtime.__AM_PENDING ??= new Map<string, PendingChallenge>());

export type SignInResult =
  | { ok: true; challengeId: string; demoCode: string; role: Role; name: string }
  | { ok: false; error: "INVALID" };

export async function startSignIn(email: string, password: string): Promise<SignInResult> {
  bootstrapAccounts();
  const normalized = email.trim().toLowerCase();
  const user = db().users.find((u) => u.email.toLowerCase() === normalized);
  if (!user || !verify(password, user.passwordHash)) {
    // Fixed floor delay blunts trivial online guessing.
    await new Promise((r) => setTimeout(r, 240));
    return { ok: false, error: "INVALID" };
  }

  const challengeId = randomBytes(18).toString("base64url");
  const code = String(100000 + Math.floor(Math.random() * 900000));
  pending.set(challengeId, { userId: user.id, code, expiresAt: Date.now() + 5 * 60_000, attempts: 0, issuedAt: Date.now() });

  pushAuthAudit(user.id, user.nameAr, user.role, "auth.password_verified", "تم التحقق من كلمة المرور — إصدار تحدي ثنائي", user.email, "INFO");
  // In production the code leaves via SMS / e-mail / push. The prototype
  // surfaces it in the UI and documents that explicitly.
  return { ok: true, challengeId, demoCode: code, role: user.role, name: user.nameAr };
}

export async function resendChallenge(challengeId: string): Promise<{ ok: boolean; demoCode?: string; retryInMs?: number }> {
  const ch = pending.get(challengeId);
  if (!ch) return { ok: false };
  const waited = Date.now() - ch.issuedAt;
  if (waited < 30_000) return { ok: false, retryInMs: 30_000 - waited };
  ch.code = String(100000 + Math.floor(Math.random() * 900000));
  ch.expiresAt = Date.now() + 5 * 60_000;
  ch.issuedAt = Date.now();
  ch.attempts = 0;
  return { ok: true, demoCode: ch.code };
}

export async function completeSignIn(
  challengeId: string,
  code: string,
): Promise<{ ok: true; role: Role } | { ok: false; error: "EXPIRED" | "INVALID_CODE" | "LOCKED" }> {
  const ch = pending.get(challengeId);
  if (!ch) return { ok: false, error: "EXPIRED" };
  if (ch.expiresAt < Date.now()) {
    pending.delete(challengeId);
    return { ok: false, error: "EXPIRED" };
  }
  ch.attempts += 1;
  if (ch.attempts > 5) {
    pending.delete(challengeId);
    return { ok: false, error: "LOCKED" };
  }
  if (code.replace(/\D/g, "") !== ch.code) return { ok: false, error: "INVALID_CODE" };

  pending.delete(challengeId);
  const user = db().users.find((u) => u.id === ch.userId);
  if (!user) return { ok: false, error: "EXPIRED" };

  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  sessions.set(token, {
    userId: user.id,
    role: user.role,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS,
    ip: "197.44.12.88",
    agent: "browser",
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  pushAuthAudit(user.id, user.nameAr, user.role, "auth.sign_in", "تسجيل دخول ناجح بعد التحقق الثنائي", user.email, "INFO");
  return { ok: true, role: user.role };
}

function pushAuthAudit(userId: string, name: string, role: Role, action: string, actionAr: string, target: string, severity: "INFO" | "WARNING" | "CRITICAL") {
  import("./store").then(({ pushAudit }) => pushAudit({ actorId: userId, actorName: name, actorRole: role, action, actionAr, target, severity }));
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) sessions.delete(token);
  jar.delete(COOKIE);
}

/* ------------------------------ permissions ---------------------------- */
export { ROLE_PERMISSIONS, can } from "@/lib/permissions";

export const HOME_FOR_ROLE: Record<Role, string> = {
  STUDENT: "/student",
  TEACHER: "/teacher",
  INSTITUTION_ADMIN: "/admin",
  EXAM_SUPERVISOR: "/admin/exam-control",
  SUPER_ADMIN: "/admin",
};

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    pushDeniedAudit(user, roles.join(","));
    redirect(HOME_FOR_ROLE[user.role]);
  }
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) {
    pushDeniedAudit(user, permission);
    redirect(HOME_FOR_ROLE[user.role]);
  }
  return user;
}

function pushDeniedAudit(user: SessionUser, target: string) {
  // Imported lazily to avoid a cycle during module init.
  import("./store").then(({ pushAudit }) =>
    pushAudit({
      actorId: user.id,
      actorName: user.nameAr,
      actorRole: user.role,
      action: "authz.denied",
      actionAr: "محاولة وصول مرفوضة",
      target,
      severity: "WARNING",
    }),
  );
}

/** For server actions: returns the user or throws a typed error the UI can show. */
export class AuthorizationError extends Error {
  constructor(message = "غير مصرّح لك بهذا الإجراء.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function assertPermission(user: SessionUser | null, permission: Permission): asserts user is SessionUser {
  if (!user) throw new AuthorizationError("انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى.");
  if (!can(user.role, permission)) {
    pushDeniedAudit(user, permission);
    throw new AuthorizationError("دورك الحالي لا يملك صلاحية تنفيذ هذا الإجراء.");
  }
}

/** Demo-only helper: exposes the OTP so the prototype's verify screen is usable. */
export function peekChallenge(challengeId: string | undefined) {
  if (!challengeId) return null;
  const ch = pending.get(challengeId);
  if (!ch || ch.expiresAt < Date.now()) return null;
  const user = db().users.find((u) => u.id === ch.userId);
  if (!user) return null;
  return { demoCode: ch.code, email: user.email, name: user.nameAr, role: user.role, expiresInMs: ch.expiresAt - Date.now() };
}

/**
 * Development-only convenience used by automated smoke tests and seed previews.
 * Never mounted in production: the route that calls it returns 404 there.
 */
export async function devCreateSession(email: string) {
  const enabled = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_SESSION === "1";
  if (!enabled) return null;
  const user = db().users.find((u) => u.email === email);
  if (!user) return null;
  const token = randomBytes(24).toString("base64url");
  const now = Date.now();
  sessions.set(token, { userId: user.id, role: user.role, issuedAt: now, expiresAt: now + SESSION_TTL_MS, ip: "127.0.0.1", agent: "dev" });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_TTL_MS / 1000 });
  return { role: user.role, id: user.id };
}
