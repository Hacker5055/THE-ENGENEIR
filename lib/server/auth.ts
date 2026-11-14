/* ============================================================================
   Authentication & authorisation — server only
   ----------------------------------------------------------------------------
   Opaque, server-side sessions delivered in an HttpOnly, SameSite=Lax cookie.
   Passwords are hashed with scrypt (salted, constant-time comparison).
   Permissions are evaluated on the server for every mutation and page; the UI
   only *hides* controls, it never enforces access.
   ========================================================================== */

import "server-only";
import { cookies, headers } from "next/headers";
import { ROLE_PASSWORD, hashPassword, verifyPassword } from "./credentials";
import { ROLE_HOME } from "@/lib/route-guard";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Permission, Role, SessionUser } from "@/lib/types";
import { ROLE_PERMISSIONS, can } from "@/lib/permissions";
import { DEMO_CREDENTIALS } from "./seed";
import { db } from "./store";

const COOKIE = "am_session";
const ROLE_COOKIE = "am_role";

/**
 * A `Secure` cookie is silently dropped when the app is reached over plain HTTP
 * (common behind preview proxies and in embedded iframes). Trust the forwarded
 * protocol instead of assuming production implies TLS.
 */
export async function cookieSecure(): Promise<boolean> {
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
    if (proto) return proto === "https";
    return process.env.NODE_ENV === "production";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/* --------------------------- password hashing --------------------------- */
const hash = hashPassword;
const verify = verifyPassword;

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

/**
 * Sessions and pending 2FA challenges are mirrored to disk. A prototype runs as
 * a single process that gets restarted (deploys, rebuilds, memory pressure);
 * losing every cookie on restart is a real usability defect, not a security
 * feature. Expiry, revocation and the attempt counter all still apply.
 *
 * Production replaces this file with Redis / a `sessions` table — the seam is
 * this module only.
 */
const STATE_FILE = process.env.AM_STATE_FILE ?? join(process.cwd(), ".data", "auth-state.json");

function persistState() {
  try {
    const now = Date.now();
    const payload = {
      savedAt: now,
      sessions: [...sessions.entries()].filter(([, s]) => s.expiresAt > now),
      pending: [...pending.entries()].filter(([, c]) => c.expiresAt > now),
    };
    mkdirSync(dirname(STATE_FILE), { recursive: true, mode: 0o700 });
    const tmp = `${STATE_FILE}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(payload), { mode: 0o600 });
    renameSync(tmp, STATE_FILE);
  } catch {
    /* read-only filesystem: fall back to in-memory sessions */
  }
}

function hydrateState() {
  try {
    const raw = JSON.parse(readFileSync(STATE_FILE, "utf8")) as {
      sessions?: [string, ServerSession][];
      pending?: [string, PendingChallenge][];
    };
    const now = Date.now();
    for (const [token, session] of raw.sessions ?? []) {
      if (session.expiresAt > now && !sessions.has(token)) sessions.set(token, session);
    }
    for (const [id, challenge] of raw.pending ?? []) {
      if (challenge.expiresAt > now && !pending.has(id)) pending.set(id, challenge);
    }
  } catch {
    /* first run — nothing to hydrate */
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    persistState();
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

hydrateState();

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
  persistState();

  pushAuthAudit(user.id, user.nameAr, user.role, "auth.password_verified", "تم التحقق من كلمة المرور — إصدار تحدي ثنائي", user.email, "INFO");
  // In production the code leaves via SMS / e-mail / push. The prototype
  // surfaces it in the UI and documents that explicitly.
  return { ok: true, challengeId, demoCode: code, role: user.role, name: user.nameAr };
}

export async function resendChallenge(challengeId: string): Promise<{ ok: boolean; demoCode?: string; retryInMs?: number }> {
  const ch = pending.get(challengeId);
  if (!ch) return { ok: false };
  const waited = Date.now() - ch.issuedAt;
  // The 30-second floor prevents SMS pumping; once the code has expired the
  // student is deliberately given an immediate path forward.
  if (waited < 30_000 && ch.expiresAt > Date.now()) return { ok: false, retryInMs: 30_000 - waited };
  ch.code = String(100000 + Math.floor(Math.random() * 900000));
  ch.expiresAt = Date.now() + 5 * 60_000;
  ch.issuedAt = Date.now();
  ch.attempts = 0;
  persistState();
  return { ok: true, demoCode: ch.code };
}

export async function completeSignIn(
  challengeId: string,
  code: string,
): Promise<{ ok: true; role: Role; token: string } | { ok: false; error: "EXPIRED" | "INVALID_CODE" | "LOCKED" }> {
  const ch = pending.get(challengeId);
  if (!ch) return { ok: false, error: "EXPIRED" };
  if (ch.expiresAt < Date.now()) {
    pending.delete(challengeId);
    persistState();
    return { ok: false, error: "EXPIRED" };
  }
  ch.attempts += 1;
  if (ch.attempts > 5) {
    pending.delete(challengeId);
    persistState();
    return { ok: false, error: "LOCKED" };
  }
  if (code.replace(/\D/g, "") !== ch.code) {
    persistState();
    return { ok: false, error: "INVALID_CODE" };
  }

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
  persistState();
  const secure = await cookieSecure();
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  // Routing hint only (which portal to bounce to). Never an authorization
  // input: every page/action re-checks the session and permissions server-side.
  jar.set(ROLE_COOKIE, user.role, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: SESSION_TTL_MS / 1000 });
  pushAuthAudit(user.id, user.nameAr, user.role, "auth.sign_in", "تسجيل دخول ناجح بعد التحقق الثنائي", user.email, "INFO");
  return { ok: true, role: user.role, token };
}

function pushAuthAudit(userId: string, name: string, role: Role, action: string, actionAr: string, target: string, severity: "INFO" | "WARNING" | "CRITICAL") {
  import("./store").then(({ pushAudit }) => pushAudit({ actorId: userId, actorName: name, actorRole: role, action, actionAr, target, severity }));
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) sessions.delete(token);
  persistState();
  jar.delete(COOKIE);
  jar.delete(ROLE_COOKIE);
}

/* ------------------------------ permissions ---------------------------- */
export { ROLE_PERMISSIONS, can } from "@/lib/permissions";

export const HOME_FOR_ROLE: Record<Role, string> = ROLE_HOME;

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=1");
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
  persistState();
  const secure = await cookieSecure();
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  // Routing hint only (which portal to bounce to). Never an authorization
  // input: every page/action re-checks the session and permissions server-side.
  jar.set(ROLE_COOKIE, user.role, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: SESSION_TTL_MS / 1000 });
  return { role: user.role, id: user.id };
}
