#!/usr/bin/env node
/* ============================================================================
   Consistent SQLite backup.
     node scripts/backup-db.mjs [--out ./backups]
   Uses SQLite's online backup API, so it is safe to run while the platform is
   serving requests (no torn file copies). Keep these off-box.
   ========================================================================== */

import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const outDir = resolve(outIndex >= 0 ? args[outIndex + 1] : "./backups");

const configured = process.env.AM_DB_PATH?.trim() || "./.data/almohandes.db";
const source = isAbsolute(configured) ? configured : resolve(process.cwd(), configured);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = join(outDir, `almohandes-${stamp}.db`);

mkdirSync(dirname(target), { recursive: true, mode: 0o700 });

let db;
try {
  db = new DatabaseSync(source, { readOnly: true });
} catch (error) {
  console.error(`cannot open ${source}: ${error.message}`);
  console.error("شغّل المنصة مرة واحدة أولاً حتى تُنشأ قاعدة البيانات، أو مرّر AM_DB_PATH الصحيح.");
  process.exit(1);
}
try {
  await backup(db, target);
  console.log(`backup written: ${target}`);
} finally {
  db.close();
}
