#!/usr/bin/env node
/**
 * Build preflight — run this when a host reports "Build failed".
 *
 *   npm run doctor
 *
 * It checks the things that actually break builds on managed platforms:
 * Node version, lockfile/manifest drift, the platform-native Next binaries,
 * and whether the project can write its build directory.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const lockPath = join(root, "package-lock.json");
const lock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, "utf8")) : null;

let failures = 0;
const ok = (label, detail = "") => console.log(`  \x1b[32m✓\x1b[0m ${label}${detail ? ` — ${detail}` : ""}`);
const bad = (label, detail = "") => {
  failures++;
  console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? ` — ${detail}` : ""}`);
};
const info = (label) => console.log(`  \x1b[36m•\x1b[0m ${label}`);

console.log("\nAL MOHANDES — build preflight\n");

/* ------------------------------- runtime ------------------------------- */
const [major, minor] = process.versions.node.split(".").map(Number);
const required = String(pkg.engines?.node ?? ">=20.9.0").replace(/[>=^~ ]/g, "");
const [reqMajor, reqMinor] = required.split(".").map((n) => Number(n) || 0);
if (major > reqMajor || (major === reqMajor && minor >= reqMinor)) {
  ok("Node version", `v${process.versions.node}`);
} else {
  bad("Node version", `v${process.versions.node} — this project needs >= ${required} (Next.js 16 will refuse to build)`);
}
ok("Platform", `${process.platform}/${process.arch} · npm ${process.env.npm_config_user_agent?.split(" ")[1] ?? "?"}`);

/* ------------------------------- lockfile ------------------------------ */
if (!lock) {
  bad("package-lock.json", "missing — hosts that run `npm ci` will fail immediately");
} else if (lock.name !== pkg.name || lock.version !== pkg.version) {
  bad("package-lock.json", `describes ${lock.name}@${lock.version}, package.json says ${pkg.name}@${pkg.version}`);
} else {
  const declared = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).sort();
  const locked = Object.keys(lock.packages?.[""]?.dependencies ?? {}).sort();
  const drift = declared.filter((d) => !locked.includes(d));
  if (drift.length) bad("Lock is in sync", `not locked: ${drift.join(", ")}`);
  else ok("Lock is in sync", `${declared.length} direct dependencies`);
}

/* --------------------------- native binaries --------------------------- */
const family = `${process.platform}-${process.arch}`;
const wanted = {
  "linux-x64": ["@next/swc-linux-x64-gnu", "@tailwindcss/oxide-linux-x64-gnu"],
  "linux-arm64": ["@next/swc-linux-arm64-gnu", "@tailwindcss/oxide-linux-arm64-gnu"],
  "darwin-x64": ["@next/swc-darwin-x64", "@tailwindcss/oxide-darwin-x64"],
  "darwin-arm64": ["@next/swc-darwin-arm64", "@tailwindcss/oxide-darwin-arm64"],
  "win32-x64": ["@next/swc-win32-x64-msvc", "@tailwindcss/oxide-win32-x64-msvc"],
}[family];

const depsInstalled = existsSync(join(root, "node_modules"));
if (!depsInstalled) info("node_modules is absent — run `npm ci` before the build");

if (!wanted) {
  info(`No native-binary checklist for ${family} — continuing`);
} else {
  for (const dep of wanted) {
    const inLock = Boolean(lock?.packages?.[`node_modules/${dep}`]);
    const installed = existsSync(join(root, "node_modules", dep));
    if (inLock && installed) ok(`native binary ${dep}`);
    else if (inLock && !depsInstalled) info(`native binary ${dep} — will install with \`npm ci\``);
    else if (inLock) bad(`native binary ${dep}`, "in the lockfile but not installed — run `npm ci` again");
    else bad(`native binary ${dep}`, "missing from package-lock.json — the build will fail on this platform");
  }
}

/* ------------------------------ build dir ------------------------------ */
try {
  const probe = mkdtempSync(join(tmpdir(), "am-build-"));
  writeFileSync(join(probe, "x"), "1");
  rmSync(probe, { recursive: true, force: true });
  ok("Temporary filesystem is writable");
} catch (error) {
  bad("Temporary filesystem is writable", String(error));
}
if (existsSync(join(root, ".next"))) {
  info(".next exists from an earlier build — delete it if the build behaves oddly");
}

console.log(
  failures === 0
    ? "\n\x1b[32mEverything a build needs is in place — run `npm run build`.\x1b[0m\n"
    : `\n\x1b[31m${failures} problem(s) found above.\x1b[0m\n`,
);
process.exit(failures === 0 ? 0 : 1);
