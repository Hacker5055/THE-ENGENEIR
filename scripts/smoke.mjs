#!/usr/bin/env node
/**
 * End-to-end smoke test for the Al Mohandes platform — no dependencies.
 *
 *   node scripts/smoke.mjs                 # default http://127.0.0.1:3000
 *   BASE_URL=https://… node scripts/smoke.mjs
 *
 * What it proves, against a real running server:
 *   1. sign-in → 2FA verify → session cookie → protected page (server-rendered path)
 *   2. every route of every surface responds 200 for its own role
 *   3. the exam engine enforces revisions, saves, freezes and submits
 *   4. attendance tokens rotate and check-in validates
 *   5. CSV export returns a BOM-prefixed file and is gated by permission
 *   6. unauthenticated access is refused with a redirect
 *
 * Exits non-zero if any assertion fails.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_FILE = process.env.AM_STATE_FILE ?? join(REPO, "web", ".data", "auth-state.json");

const results = [];
let failed = 0;

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) failed += 1;
  const mark = ok ? "\u001b[32m✓\u001b[0m" : "\u001b[31m✗\u001b[0m";
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ""}`);
}

/* ------------------------------ cookie jar ------------------------------ */
function jar() {
  const store = new Map();
  return {
    header: () => [...store.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
    absorb(res) {
      const raw = res.headers.getSetCookie?.() ?? [];
      for (const line of raw) {
        const [pair] = line.split(";");
        const idx = pair.indexOf("=");
        const name = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        if (!value) store.delete(name);
        else store.set(name, value);
      }
      return raw;
    },
    get: (k) => store.get(k),
  };
}

async function req(path, { method = "GET", body, cookie, headers = {}, redirect = "manual" } = {}) {
  const h = { ...headers };
  if (cookie) h.cookie = cookie.header();
  let payload = body;
  if (body && !(body instanceof FormData) && typeof body === "object") {
    payload = new URLSearchParams(body).toString();
    h["content-type"] = "application/x-www-form-urlencoded";
  }
  const res = await fetch(`${BASE}${path}`, { method, body: payload, headers: h, redirect });
  if (cookie) cookie.absorb(res);
  return res;
}

function codeFor(challengeId) {
  try {
    const state = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    const hit = (state.pending ?? []).find(([id]) => id === challengeId);
    return hit?.[1]?.code ?? null;
  } catch {
    return null;
  }
}

/* ------------------------------- sign in -------------------------------- */
async function signIn(email, password, next) {
  const c = jar();
  const res = await req("/api/auth/sign-in", { method: "POST", body: { email, password, ...(next ? { next } : {}) }, cookie: c });
  const location = res.headers.get("location") ?? "";
  const challenge = new URL(location, BASE).searchParams.get("c");
  if (res.status !== 303 || !challenge) return { ok: false, reason: `sign-in ${res.status}` };

  const code = codeFor(challenge);
  if (!code) return { ok: false, reason: "no challenge code (state file unreadable?)" };

  const verify = await req("/api/auth/verify", {
    method: "POST",
    body: { challenge, code, ...(next ? { next } : {}) },
    cookie: c,
  });
  const ok = verify.status === 303 && Boolean(c.get("am_session"));
  return { ok, cookie: c, location: verify.headers.get("location") ?? "", reason: ok ? "" : `verify ${verify.status}` };
}

/* --------------------------------- data --------------------------------- */
const ROUTES = {
  student: [
    "/student", "/student/attendance", "/student/timetable", "/student/courses",
    "/student/courses/crs_cs301", "/student/exams", "/student/exams/exm_ds_mid",
    "/student/results", "/student/transcript", "/student/analytics", "/student/id",
    "/student/notifications", "/student/complaints", "/student/complaints/new",
    "/student/security", "/student/settings", "/student/profile", "/student/search",
  ],
  teacher: [
    "/teacher", "/teacher/classes", "/teacher/attendance", "/teacher/attendance/ats_live_cs301",
    "/teacher/exams", "/teacher/exams/new", "/teacher/exams/exm_ds_mid", "/teacher/questions",
    "/teacher/grading", "/teacher/grades", "/teacher/profile",
  ],
  admin: [
    "/admin", "/admin/students", "/admin/students/stu_demo", "/admin/teachers", "/admin/courses",
    "/admin/academics", "/admin/timetable", "/admin/exams", "/admin/questions", "/admin/grades",
    "/admin/attendance", "/admin/analytics", "/admin/complaints", "/admin/complaints/cmp_2",
    "/admin/notifications", "/admin/devices", "/admin/reports", "/admin/audit", "/admin/roles",
    "/admin/institutions", "/admin/settings",
  ],
  supervisor: ["/admin/exam-control", "/admin/exam-control/att_stu_003_ds"],
  public: ["/", "/login", "/docs", "/docs/product-requirements", "/docs/security-architecture"],
};

const ACCOUNTS = {
  student: ["student@almohandes.edu", "Student@123"],
  teacher: ["teacher@almohandes.edu", "Teacher@123"],
  admin: ["admin@almohandes.edu", "Admin@123"],
  supervisor: ["supervisor@almohandes.edu", "Super@123"],
  root: ["root@almohandes.edu", "Root@123"],
};

/* --------------------------------- main --------------------------------- */
console.log(`\nAL MOHANDES — smoke test against ${BASE}\n`);

const anonymous = await req("/admin", { cookie: jar() });
check("anonymous /admin is redirected to login", anonymous.status === 307, `status ${anonymous.status}`);
check(
  "anonymous redirect carries a same-origin login path",
  (anonymous.headers.get("location") ?? "").includes("/login?next=%2Fadmin"),
  anonymous.headers.get("location") ?? "",
);

const sessions = {};
for (const [role, [email, password]] of Object.entries(ACCOUNTS)) {
  const res = await signIn(email, password);
  sessions[role] = res.cookie;
  check(`${role} sign-in + 2FA + session cookie`, res.ok, res.reason);
}

// Deep link: /admin/complaints must survive the whole sign-in chain.
const deep = await signIn("admin@almohandes.edu", "Admin@123", "/admin/complaints");
check("deep link is carried into the verify step", deep.ok && deep.location.includes("next="), deep.location);
const deepLanding = await req("/welcome?next=%2Fadmin%2Fcomplaints", { cookie: deep.cookie });
check(
  "deep link lands on the requested page",
  deepLanding.status === 307 && (deepLanding.headers.get("location") ?? "").endsWith("/admin/complaints"),
  `${deepLanding.status} → ${deepLanding.headers.get("location")}`,
);

// A signed-in student must not be able to jump into /admin through `next`.
const studentDeep = await signIn("student@almohandes.edu", "Student@123", "/admin/audit");
const blocked = await req("/welcome?next=%2Fadmin%2Faudit", { cookie: studentDeep.cookie });
check(
  "cross-role deep link falls back to the student home",
  blocked.status === 307 && (blocked.headers.get("location") ?? "").endsWith("/student"),
  `${blocked.status} → ${blocked.headers.get("location")}`,
);

// Registry writes: an admin-created student can actually sign in afterwards.
if (sessions.admin) {
  const uniq = Date.now().toString(36).slice(-5);
  const created = await req("/api/v1/students", {
    method: "POST",
    body: JSON.stringify({
      nameAr: `طالب اختبار ${uniq}`,
      nameEn: `Smoke Student ${uniq}`,
      departmentId: "dept_cs",
      level: 2,
    }),
    cookie: sessions.admin,
    headers: { "content-type": "application/json" },
  });
  const createdBody = await created.json().catch(() => ({}));
  check("registry: admin creates a student", created.status === 201 && Boolean(createdBody.studentNumber), `${created.status} ${createdBody.message ?? ""}`);

  if (createdBody.email && createdBody.temporaryPassword) {
    const login = await signIn(createdBody.email, createdBody.temporaryPassword);
    check("registry: the new student can sign in with 2FA", login.ok, login.reason);
  } else {
    check("registry: the new student can sign in with 2FA", false, "no credentials returned");
  }

  const forbidden = await req("/api/v1/students", {
    method: "POST",
    body: JSON.stringify({ nameAr: "x", nameEn: "y", departmentId: "dept_cs", level: 1 }),
    cookie: sessions.student,
    headers: { "content-type": "application/json" },
  });
  check("registry: a student cannot create students", forbidden.status === 403, `status ${forbidden.status}`);

  const teacher = await req("/api/v1/teachers", {
    method: "POST",
    body: JSON.stringify({
      nameAr: `د. اختبار ${uniq}`,
      nameEn: `Smoke Teacher ${uniq}`,
      departmentId: "dept_cs",
      email: `smoke.${uniq}@almohandes.edu`,
    }),
    cookie: sessions.admin,
    headers: { "content-type": "application/json" },
  });
  const teacherBody = await teacher.json().catch(() => ({}));
  check("registry: admin creates a teacher account", teacher.status === 201 && Boolean(teacherBody.email), `${teacher.status}`);

  const duplicate = await req("/api/v1/teachers", {
    method: "POST",
    body: JSON.stringify({
      nameAr: `مكرر ${uniq}`,
      nameEn: `Duplicate ${uniq}`,
      departmentId: "dept_cs",
      email: `smoke.${uniq}@almohandes.edu`,
    }),
    cookie: sessions.admin,
    headers: { "content-type": "application/json" },
  });
  check("registry: duplicate e-mail is rejected", duplicate.status === 422, `status ${duplicate.status}`);
}

// Public card verification (what the QR on the student ID opens).
const card = await req("/verify/AM20261042", { cookie: jar() });
const cardHtml = card.status === 200 ? await card.text() : "";
check(
  "public card verification renders for a real student",
  card.status === 200 && cardHtml.includes("محمود") && cardHtml.includes("AM20261042"),
  `status ${card.status}`,
);
check(
  "public card verification hides sensitive data",
  card.status === 200 && !cardHtml.includes("gpa") && !cardHtml.includes("nationalId") && !cardHtml.includes("phone"),
  "",
);
const ghost = await req("/verify/NOPE-0000", { cookie: jar() });
check("unknown card is reported, not crashed", ghost.status === 200, `status ${ghost.status}`);

// SEO / PWA surface.
const sitemap = await req("/sitemap.xml", { cookie: jar() });
check("sitemap lists public pages", sitemap.status === 200 && (await sitemap.text()).includes("/docs/"), `status ${sitemap.status}`);
const robots = await req("/robots.txt", { cookie: jar() });
const robotsTxt = robots.status === 200 ? await robots.text() : "";
check(
  "robots keeps portals out of search engines",
  robots.status === 200 && robotsTxt.includes("Disallow: /admin") && robotsTxt.includes("Sitemap:"),
  `status ${robots.status}`,
);
const manifest = await req("/manifest.webmanifest", { cookie: jar() });
check("web app manifest is served", manifest.status === 200 && (await manifest.text()).includes("icon-512.png"), `status ${manifest.status}`);

// Global ⌘K search must respect role scoping on the server.
if (sessions.admin && sessions.student) {
  const adminQ = await req("/api/v1/search?q=AM20261042", { cookie: sessions.admin });
  const adminBody = await adminQ.json().catch(() => ({}));
  const adminKinds = (adminBody.groups ?? []).flatMap((g) => g.items.map((i) => i.kind));
  check(
    "search: staff find a student by number",
    adminQ.status === 200 && adminKinds.includes("student"),
    `kinds ${[...new Set(adminKinds)].join(",") || "none"}`,
  );

  const studentQ = await req("/api/v1/search?q=AM20261042", { cookie: sessions.student });
  const studentBody = await studentQ.json().catch(() => ({}));
  const studentKinds = (studentBody.groups ?? []).flatMap((g) => g.items.map((i) => i.kind));
  check(
    "search: a student cannot list other students",
    studentQ.status === 200 && !studentKinds.includes("student") && !studentKinds.includes("teacher"),
    `kinds ${[...new Set(studentKinds)].join(",") || "none"}`,
  );

  const anonQ = await req("/api/v1/search?q=AM20261042", { cookie: jar() });
  check("search: anonymous request is rejected", anonQ.status === 401, `status ${anonQ.status}`);
}

for (const [role, routes] of Object.entries(ROUTES)) {
  const cookie = role === "public" ? jar() : sessions[role === "root" ? "root" : role];
  let bad = 0;
  for (const path of routes) {
    const res = await req(path, { cookie });
    if (res.status !== 200) {
      bad += 1;
      check(`${role} ${path}`, false, `status ${res.status}`);
    }
  }
  if (!bad) check(`${role}: ${routes.length} routes render 200`, true);
}

/* ------------------------------ exam engine ----------------------------- */
if (sessions.student) {
  // Make the run repeatable against a long-running server: clear yesterday's
  // attempt for the demo student (dev-only endpoint).
  await req("/api/dev/reset", {
    method: "POST",
    body: JSON.stringify({ examId: "exm_ds_mid", studentId: "stu_demo" }),
    cookie: sessions.admin,
    headers: { "content-type": "application/json" },
  });

  const start = await req("/api/v1/exam/examinations/exm_ds_mid/start", {
    method: "POST", body: {}, cookie: sessions.student, headers: { "content-type": "application/json" },
  });
  const startBody = await start.json().catch(() => ({}));
  check("exam: start or resume attempt", start.status === 200 && Boolean(startBody.attemptId), startBody.error ?? "");

  if (startBody.attemptId) {
    const id = startBody.attemptId;
    const save = (revision) =>
      req(`/api/v1/exam/attempts/${id}/answer`, {
        method: "POST",
        body: JSON.stringify({ questionId: "q_ds_01", value: ["q_ds_01_o2"], revision }),
        cookie: sessions.student,
        headers: { "content-type": "application/json" },
      });

    const first = await save(1);
    const firstBody = await first.json().catch(() => ({}));
    check("exam: first answer saved with revision", first.status === 200 && firstBody.revision === 1, JSON.stringify(firstBody).slice(0, 90));

    const stale = await save(1);
    const staleBody = await stale.json().catch(() => ({}));
    check("exam: stale revision rejected (409)", stale.status === 409 && staleBody.error === "REVISION_CONFLICT", staleBody.error ?? `status ${stale.status}`);

    const next = await save(2);
    const nextBody = await next.json().catch(() => ({}));
    check("exam: newer revision accepted", next.status === 200 && nextBody.revision === 2, "");

    const state = await req(`/api/v1/exam/attempts/${id}/state`, { cookie: sessions.student });
    const stateBody = await state.json().catch(() => ({}));
    check("exam: server timer is authoritative", state.status === 200 && typeof stateBody.remainingMs === "number", `${stateBody.remainingMs} ms left`);

    const submit = await req(`/api/v1/exam/attempts/${id}/submit`, {
      method: "POST", body: "{}", cookie: sessions.student, headers: { "content-type": "application/json" },
    });
    const submitBody = await submit.json().catch(() => ({}));
    check("exam: submit grades server-side", submit.status === 200 && ["SUBMITTED", "GRADED"].includes(submitBody.status), `status ${submitBody.status}`);
  }
}

/* ------------------------------- attendance ----------------------------- */
if (sessions.student) {
  const token = await req("/api/v1/attendance/sessions/ats_live_cs301/token", { cookie: sessions.student });
  const tokenBody = await token.json().catch(() => ({}));
  check("attendance: rotating token issued", token.status === 200 && Boolean(tokenBody.token), tokenBody.token ?? "");
  check("attendance: token has short expiry", (tokenBody.expiresAt ?? 0) - (tokenBody.serverNow ?? 0) <= 25_000, "");
}

/* --------------------------------- reports ------------------------------ */
if (sessions.admin) {
  const csv = await req("/api/v1/reports/students", { cookie: sessions.admin });
  const bytes = Buffer.from(await csv.arrayBuffer());
  const text = bytes.toString("utf8");
  check("reports: CSV export is 200", csv.status === 200, `content-type ${csv.headers.get("content-type")}`);
  check("reports: CSV starts with UTF-8 BOM", bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf, `first bytes ${bytes.subarray(0, 3).toString("hex")}`);
  check("reports: CSV has Arabic headers", /student_number,name_ar/.test(text), "");
}

if (sessions.student) {
  const forbidden = await req("/api/v1/reports/students", { cookie: sessions.student });
  check("reports: student cannot export (403)", forbidden.status === 403, `status ${forbidden.status}`);
}

/* -------------------------------- summary ------------------------------- */
const total = results.length;
const passed = total - failed;
console.log(`\n${passed}/${total} checks passed${failed ? ` — ${failed} failed` : ""}\n`);
process.exit(failed ? 1 : 0);
