/* ============================================================================
   Authentication & authorisation — server only
   ----------------------------------------------------------------------------
   Opaque, server-side sessions delivered in an HttpOnly, SameSite=Lax cookie.
   Passwords are hashed with scrypt (salted, constant-time comparison).
   Sessions, pending challenges, password-reset tokens and login throttling all
   live in SQLite, so a restart or a redeploy does not sign anybody out and a
   stolen database file does not contain codes in the clear.

   Two-factor: e-mail OTP when SMTP is configured and the institution requires
   it, the on-screen code in demo mode, and single-factor sign-in otherwise
   (a production instance with no mail server must not lock its own users out).
   ========================================================================== */

import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { ROLE_PASSWORD, hashPassword, verifyPassword } from "./credentials";
import { ROLE_HOME } from "@/lib/route-guard";
import type { Permission, Role, SessionUser } from "@/lib/types";
import { ROLE_PERMISSIONS, can } from "@/lib/permissions";
import { DEMO_CREDENTIALS } from "./seed";
import { db, demoMode } from "./store";
import { sqlite, transaction } from "./persistence/database";
import { isStrongPassword } from "./bootstrap";
import { mailConfigured, sendPasswordReset, sendVerificationCode } from "./mail";

const COOKIE = "am_session";
const ROLE_COOKIE = "am_role";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const CHALLENGE_TTL_MS = 5 * 60_000;
const RESET_TTL_MS = 60 * 60_000;

/* ------------------------------ throttling ------------------------------ */
const RATE_WINDOW_MS = 15 * 60_000;
const RATE_MAX_FAILURES = 8;

const hash = hashPassword;
const verify = verifyPassword;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

/**
 * A `Secure` cookie is silently dropped when the app is reached over plain HTTP
 * (common behind preview proxies). Trust the forwarded protocol instead of
 * assuming production implies TLS.
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

export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

function rateKey(email: string, ip: string) {
  return `${email.toLowerCase()}|${ip}`;
}

function checkRate(email: string, ip: string): { blocked: boolean; retryInMs: number } {
  const row = sqlite()
    .prepare("SELECT failures, first_at, last_at FROM login_attempts WHERE key = ?")
    .get(rateKey(email, ip)) as { failures: number; first_at: number; last_at: number } | undefined;
  if (!row) return { blocked: false, retryInMs: 0 };
  const now = Date.now();
  if (now - row.first_at > RATE_WINDOW_MS) return { blocked: false, retryInMs: 0 };
  if (row.failures < RATE_MAX_FAILURES) return { blocked: false, retryInMs: 0 };
  return { blocked: true, retryInMs: row.first_at + RATE_WINDOW_MS - now };
}

function recordFailure(email: string, ip: string) {
  const key = rateKey(email, ip);
  const now = Date.now();
  const row = sqlite().prepare("SELECT failures, first_at FROM login_attempts WHERE key = ?").get(key) as
    | { failures: number; first_at: number }
    | undefined;
  if (!row || now - row.first_at > RATE_WINDOW_MS) {
    sqlite()
      .prepare(
        "INSERT INTO login_attempts (key, failures, first_at, last_at) VALUES (?, 1, ?, ?) ON CONFLICT(key) DO UPDATE SET failures = 1, first_at = excluded.first_at, last_at = excluded.last_at",
      )
      .run(key, now, now);
    return;
  }
  sqlite()
    .prepare("UPDATE login_attempts SET failures = failures + 1, last_at = ? WHERE key = ?")
    .run(now, key);
}

function clearFailures(email: string, ip: string) {
  sqlite().prepare("DELETE FROM login_attempts WHERE key = ?").run(rateKey(email, ip));
}

/* ----------------------------- demo accounts ---------------------------- */
let bootstrapped = false;
function bootstrapAccounts() {
  if (bootstrapped) return;
  bootstrapped = true;
  // Production accounts always carry a hash from `buildProductionDatabase` or
  // from account creation; only demo data falls back to the documented password.
  if (!demoMode()) return;
  for (const cred of DEMO_CREDENTIALS) {
    const u = db().users.find((x) => x.email === cred.email);
    if (u && !u.passwordHash) u.passwordHash = hash(cred.password);
  }
  for (const u of db().users) {
    if (!u.passwordHash) u.passwordHash = hash(ROLE_PASSWORD[u.role]);
  }
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

function saveSession(token: string, session: ServerSession) {
  sqlite()
    .prepare(
      "INSERT INTO sessions (token, user_id, role, issued_at, expires_at, ip, agent) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(token) DO UPDATE SET expires_at = excluded.expires_at",
    )
    .run(token, session.userId, session.role, session.issuedAt, session.expiresAt, session.ip, session.agent);
}

function loadSession(token: string): ServerSession | null {
  const row = sqlite()
    .prepare("SELECT user_id, role, issued_at, expires_at, ip, agent FROM sessions WHERE token = ?")
    .get(token) as
    | { user_id: string; role: string; issued_at: number; expires_at: number; ip: string; agent: string }
    | undefined;
  if (!row) return null;
  return {
    userId: row.user_id,
    role: row.role as Role,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    ip: row.ip,
    agent: row.agent,
  };
}

function deleteSession(token: string) {
  sqlite().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

/** Housekeeping: drop expired rows so the file does not grow without bound. */
export function purgeExpiredAuthRows() {
  const now = Date.now();
  sqlite().prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
  sqlite().prepare("DELETE FROM auth_challenges WHERE expires_at < ?").run(now);
  sqlite().prepare("DELETE FROM password_resets WHERE expires_at < ?").run(now);
  sqlite().prepare("DELETE FROM login_attempts WHERE last_at < ?").run(now - 24 * 60 * 60_000);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = loadSession(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    deleteSession(token);
    return null;
  }
  const user = db().users.find((u) => u.id === session.userId);
  if (!user) return null;
  const { passwordHash: _ph, ...safe } = user;
  return { ...safe, mustChangePassword: user.mustChangePassword };
}

/* ---------------------------- two-factor flow --------------------------- */
interface PendingChallenge {
  id: string;
  userId: string;
  expiresAt: number;
  attempts: number;
}

export type SignInResult =
  | {
      ok: true;
      kind: "CHALLENGE";
      challengeId: string;
      /** Only present in demo mode, where the code is shown on screen. */
      demoCode?: string;
      role: Role;
      name: string;
    }
  | { ok: true; kind: "SESSION"; token: string; role: Role; name: string }
  | { ok: false; error: "INVALID" | "RATE_LIMITED" };

type TwoFactorMode = "DEMO" | "EMAIL" | "NONE";

function twoFactorMode(): TwoFactorMode {
  if (demoMode()) return "DEMO";
  if (mailConfigured() && db().settings.requireTwoFactor) return "EMAIL";
  return "NONE";
}

function createChallenge(userId: string): { id: string; code: string } {
  const id = randomBytes(18).toString("base64url");
  const code = String(100000 + Math.floor(Math.random() * 900000));
  sqlite()
    .prepare(
      "INSERT INTO auth_challenges (id, user_id, code_hash, issued_at, expires_at, attempts, demo_code) VALUES (?, ?, ?, ?, ?, 0, ?)",
    )
    .run(id, userId, digest(`${id}:${code}`), Date.now(), Date.now() + CHALLENGE_TTL_MS, demoMode() ? code : null);
  return { id, code };
}

function readChallenge(id: string): PendingChallenge | null {
  const row = sqlite()
    .prepare("SELECT id, user_id, expires_at, attempts FROM auth_challenges WHERE id = ?")
    .get(id) as { id: string; user_id: string; expires_at: number; attempts: number } | undefined;
  if (!row) return null;
  return { id: row.id, userId: row.user_id, expiresAt: row.expires_at, attempts: row.attempts };
}

async function issueSession(user: { id: string; role: Role; email: string }) {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  saveSession(token, {
    userId: user.id,
    role: user.role,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS,
    ip: await clientIp(),
    agent: (await headers()).get("user-agent")?.slice(0, 180) ?? "unknown",
  });
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
  jar.set(ROLE_COOKIE, user.role, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return token;
}

export async function startSignIn(email: string, password: string): Promise<SignInResult> {
  bootstrapAccounts();
  const normalized = email.trim().toLowerCase();
  const ip = await clientIp();

  const rate = checkRate(normalized, ip);
  if (rate.blocked) {
    await new Promise((r) => setTimeout(r, 300));
    return { ok: false, error: "RATE_LIMITED" };
  }

  const user = db().users.find((u) => u.email.toLowerCase() === normalized);
  if (!user || !verify(password, user.passwordHash)) {
    recordFailure(normalized, ip);
    // Fixed floor delay blunts trivial online guessing.
    await new Promise((r) => setTimeout(r, 240));
    return { ok: false, error: "INVALID" };
  }
  clearFailures(normalized, ip);

  const mode = twoFactorMode();
  if (mode === "NONE") {
    const token = await issueSession(user);
    pushAuthAudit(user.id, user.nameAr, user.role, "auth.sign_in", "تسجيل دخول ناجح", user.email, "INFO");
    return { ok: true, kind: "SESSION", token, role: user.role, name: user.nameAr };
  }

  const challenge = createChallenge(user.id);
  if (mode === "EMAIL") {
    const sent = await sendVerificationCode(user.email, challenge.code, 5);
    if (!sent.ok) {
      // Mail is broken: locking every user out is worse than single-factor.
      const token = await issueSession(user);
      pushAuthAudit(
        user.id,
        user.nameAr,
        user.role,
        "auth.otp.mail_failed",
        "تعذر إرسال رمز التحقق — تم الدخول بعامل واحد",
        user.email,
        "CRITICAL",
      );
      return { ok: true, kind: "SESSION", token, role: user.role, name: user.nameAr };
    }
  }
  pushAuthAudit(user.id, user.nameAr, user.role, "auth.password_verified", "تم التحقق من كلمة المرور — إصدار تحدي ثنائي", user.email, "INFO");
  return {
    ok: true,
    kind: "CHALLENGE",
    challengeId: challenge.id,
    demoCode: mode === "DEMO" ? challenge.code : undefined,
    role: user.role,
    name: user.nameAr,
  };
}

export async function resendChallenge(challengeId: string): Promise<{ ok: boolean; demoCode?: string; retryInMs?: number }> {
  const row = sqlite()
    .prepare("SELECT user_id, issued_at, expires_at FROM auth_challenges WHERE id = ?")
    .get(challengeId) as { user_id: string; issued_at: number; expires_at: number } | undefined;
  if (!row) return { ok: false };
  const waited = Date.now() - row.issued_at;
  // The 30-second floor prevents mail pumping; once the code has expired the
  // student is deliberately given an immediate path forward.
  if (waited < 30_000 && row.expires_at > Date.now()) return { ok: false, retryInMs: 30_000 - waited };

  const code = String(100000 + Math.floor(Math.random() * 900000));
  sqlite()
    .prepare("UPDATE auth_challenges SET code_hash = ?, expires_at = ?, issued_at = ?, attempts = 0 WHERE id = ?")
    .run(digest(`${challengeId}:${code}`), Date.now() + CHALLENGE_TTL_MS, Date.now(), challengeId);

  const user = db().users.find((u) => u.id === row.user_id);
  if (user && mailConfigured() && !demoMode()) {
    const sent = await sendVerificationCode(user.email, code, 5);
    if (!sent.ok) return { ok: false };
    return { ok: true };
  }
  return { ok: true, demoCode: demoMode() ? code : undefined };
}

export async function completeSignIn(
  challengeId: string,
  code: string,
): Promise<{ ok: true; role: Role; token: string } | { ok: false; error: "EXPIRED" | "INVALID_CODE" | "LOCKED" }> {
  const challenge = readChallenge(challengeId);
  if (!challenge) return { ok: false, error: "EXPIRED" };
  if (challenge.expiresAt < Date.now()) {
    sqlite().prepare("DELETE FROM auth_challenges WHERE id = ?").run(challengeId);
    return { ok: false, error: "EXPIRED" };
  }
  if (challenge.attempts >= 5) {
    sqlite().prepare("DELETE FROM auth_challenges WHERE id = ?").run(challengeId);
    return { ok: false, error: "LOCKED" };
  }

  const stored = sqlite()
    .prepare("SELECT code_hash FROM auth_challenges WHERE id = ?")
    .get(challengeId) as { code_hash: string } | undefined;
  const supplied = digest(`${challengeId}:${code.replace(/\D/g, "")}`);
  if (!stored || stored.code_hash !== supplied) {
    sqlite().prepare("UPDATE auth_challenges SET attempts = attempts + 1 WHERE id = ?").run(challengeId);
    return { ok: false, error: "INVALID_CODE" };
  }

  sqlite().prepare("DELETE FROM auth_challenges WHERE id = ?").run(challengeId);
  const user = db().users.find((u) => u.id === challenge.userId);
  if (!user) return { ok: false, error: "EXPIRED" };

  const token = await issueSession(user);
  pushAuthAudit(user.id, user.nameAr, user.role, "auth.sign_in", "تسجيل دخول ناجح بعد التحقق الثنائي", user.email, "INFO");
  return { ok: true, role: user.role, token };
}

function pushAuthAudit(
  userId: string,
  name: string,
  role: Role,
  action: string,
  actionAr: string,
  target: string,
  severity: "INFO" | "WARNING" | "CRITICAL",
) {
  import("./store").then(({ pushAudit }) =>
    pushAudit({ actorId: userId, actorName: name, actorRole: role, action, actionAr, target, severity }),
  );
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) deleteSession(token);
  jar.delete(COOKIE);
  jar.delete(ROLE_COOKIE);
}

/* ------------------------- password management ------------------------- */

export type PasswordError =
  | "WEAK"
  | "MISMATCH"
  | "WRONG_CURRENT"
  | "EXPIRED_TOKEN"
  | "NO_MAIL";

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<{ ok: true } | { ok: false; error: PasswordError }> {
  const user = db().users.find((u) => u.id === userId);
  if (!user) return { ok: false, error: "WRONG_CURRENT" };
  if (!verify(currentPassword, user.passwordHash)) return { ok: false, error: "WRONG_CURRENT" };
  if (newPassword !== confirmPassword) return { ok: false, error: "MISMATCH" };
  if (!isStrongPassword(newPassword)) return { ok: false, error: "WEAK" };
  if (newPassword === currentPassword) return { ok: false, error: "WEAK" };

  user.passwordHash = hash(newPassword);
  user.passwordChangedAt = Date.now();
  delete user.mustChangePassword;
  // Every other session for that account dies with the old password.
  sqlite().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  pushAuthAudit(user.id, user.nameAr, user.role, "auth.password_changed", "تم تغيير كلمة المرور", user.email, "INFO");
  return { ok: true };
}

/** Always resolves the same way: never reveal whether an address exists. */
export async function requestPasswordReset(email: string, baseUrl: string): Promise<{ ok: true }> {
  const user = db().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    await new Promise((r) => setTimeout(r, 220));
    return { ok: true };
  }
  if (!mailConfigured()) return { ok: true };

  const token = randomBytes(32).toString("base64url");
  transaction(() => {
    sqlite()
      .prepare("DELETE FROM password_resets WHERE user_id = ?")
      .run(user.id);
    sqlite()
      .prepare("INSERT INTO password_resets (token_hash, user_id, issued_at, expires_at) VALUES (?, ?, ?, ?)")
      .run(digest(token), user.id, Date.now(), Date.now() + RESET_TTL_MS);
  });
  const link = `${baseUrl.replace(/\/$/, "")}/reset-password/${token}`;
  const sent = await sendPasswordReset(user.email, link, 60);
  pushAuthAudit(
    user.id,
    user.nameAr,
    user.role,
    sent.ok ? "auth.reset_requested" : "auth.reset_mail_failed",
    sent.ok ? "طلب إعادة تعيين كلمة المرور" : "تعذر إرسال رابط إعادة التعيين",
    user.email,
    sent.ok ? "WARNING" : "CRITICAL",
  );
  return { ok: true };
}

export async function resetPassword(
  token: string,
  newPassword: string,
  confirmPassword: string,
): Promise<{ ok: true } | { ok: false; error: PasswordError }> {
  const row = sqlite()
    .prepare("SELECT user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?")
    .get(digest(token)) as { user_id: string; expires_at: number; used_at: number | null } | undefined;
  if (!row || row.used_at || row.expires_at < Date.now()) return { ok: false, error: "EXPIRED_TOKEN" };
  if (newPassword !== confirmPassword) return { ok: false, error: "MISMATCH" };
  if (!isStrongPassword(newPassword)) return { ok: false, error: "WEAK" };

  const user = db().users.find((u) => u.id === row.user_id);
  if (!user) return { ok: false, error: "EXPIRED_TOKEN" };

  user.passwordHash = hash(newPassword);
  user.passwordChangedAt = Date.now();
  delete user.mustChangePassword;
  sqlite().prepare("UPDATE password_resets SET used_at = ? WHERE token_hash = ?").run(Date.now(), digest(token));
  sqlite().prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
  pushAuthAudit(user.id, user.nameAr, user.role, "auth.password_reset", "تمت إعادة تعيين كلمة المرور", user.email, "WARNING");
  return { ok: true };
}

/* ------------------------------ permissions ---------------------------- */
export { ROLE_PERMISSIONS, can } from "@/lib/permissions";

export const HOME_FOR_ROLE: Record<Role, string> = ROLE_HOME;

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=1");
  if (user.mustChangePassword) redirect("/change-password");
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
  const challenge = readChallenge(challengeId);
  if (!challenge || challenge.expiresAt < Date.now()) return null;
  const user = db().users.find((u) => u.id === challenge.userId);
  if (!user) return null;
  const code = demoMode() ? peekDemoCode(challengeId) : undefined;
  return {
    demoCode: code,
    email: user.email,
    name: user.nameAr,
    role: user.role,
    expiresInMs: challenge.expiresAt - Date.now(),
  };
}

/**
 * In demo mode the code is recoverable because it is deliberately shown on
 * screen. Production challenges are stored hashed only.
 */
function peekDemoCode(challengeId: string): string | undefined {
  const row = sqlite()
    .prepare("SELECT demo_code FROM challenge_codes WHERE challenge_id = ?")
    .get(challengeId) as { demo_code: string } | undefined;
  return row?.demo_code;
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
  await issueSession(user);
  return { role: user.role, id: user.id };
}
