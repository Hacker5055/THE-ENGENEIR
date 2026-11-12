#!/usr/bin/env node
/**
 * Generates docs/*.md from the single source of truth: web/lib/docs.ts.
 *
 * The in-app documentation pages and the repository Markdown therefore can
 * never drift apart. Run from the repository root:
 *
 *   npx tsc web/lib/docs.ts --outDir /tmp/am-docs --module commonjs \
 *     --target es2020 --skipLibCheck
 *   node scripts/export-docs.mjs /tmp/am-docs/docs.js
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const modulePath = process.argv[2] ?? "/tmp/am-docs/docs.js";
const { DOCS } = require(modulePath);

const OUT = join(process.cwd(), "docs");
mkdirSync(OUT, { recursive: true });

const slugTitle = (slug) =>
  slug
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

function render(block) {
  switch (block.t) {
    case "h2":
      return `## ${block.ar}\n\n_${block.en}_\n`;
    case "h3":
      return `### ${block.ar}\n\n_${block.en}_\n`;
    case "p":
      return `${block.ar}\n\n> ${block.en}\n`;
    case "ul":
      return block.items.map((i) => `- ${i.ar}\n  <br>_${i.en}_`).join("\n") + "\n";
    case "ol":
      return block.items.map((i, n) => `${n + 1}. ${i.ar}\n   <br>_${i.en}_`).join("\n") + "\n";
    case "table": {
      const head = `| ${block.headers.map((h) => `${h.ar} / ${h.en}`).join(" | ")} |`;
      const sep = `| ${block.headers.map(() => "---").join(" | ")} |`;
      const rows = block.rows.map((r) => `| ${r.map((c) => String(c).replaceAll("|", "\\|")).join(" | ")} |`);
      return [head, sep, ...rows].join("\n") + "\n";
    }
    case "note":
      return `> **${block.tone === "warn" ? "⚠️" : block.tone === "success" ? "✅" : "ℹ️"}** ${block.ar}\n>\n> _${block.en}_\n`;
    case "code":
      return `\`\`\`${block.lang ?? "text"}\n${block.body}\n\`\`\`\n`;
    case "kv":
      return `| ${"Key"} | ${"Value"} |\n| --- | --- |\n` + block.rows.map((r) => `| ${r.kAr} / ${r.kEn} | \`${r.v}\` |`).join("\n") + "\n";
    default:
      return "";
  }
}

const index = [];

for (const doc of DOCS) {
  const body = [
    `# ${doc.num}. ${doc.titleAr}`,
    "",
    `**${doc.titleEn}** · _updated ${doc.updated}_`,
    "",
    `${doc.descAr}`,
    "",
    `> ${doc.descEn}`,
    "",
    "---",
    "",
    ...doc.blocks.map(render),
    "---",
    "",
    `Source of truth: \`web/lib/docs.ts\`. Edit there, then re-run \`node scripts/export-docs.mjs\`.`,
    "",
  ].join("\n");

  const file = `${doc.num}-${doc.slug}.md`;
  writeFileSync(join(OUT, file), body, "utf8");
  index.push(`| ${doc.num} | [${doc.titleAr}](./${file}) | ${doc.titleEn} | \`docs/${file}\` |`);
}

const readme = [
  "# AL MOHANDES — Delivery documentation",
  "",
  "This folder mirrors the in-app documentation (`/docs` on the running platform).",
  "Both are generated from `web/lib/docs.ts` so they cannot drift apart.",
  "",
  "| # | المستند | Document | File |",
  "| --- | --- | --- | --- |",
  ...index,
  "",
  "## Related artefacts",
  "",
  "| Artefact | Path |",
  "| --- | --- |",
  "| PostgreSQL DDL (multi-tenant + exam engine) | [`db/schema.sql`](../db/schema.sql) |",
  "| OpenAPI 3.1 specification | [`openapi.yaml`](../openapi.yaml) |",
  "| Permission matrix (single source) | [`web/lib/permissions.ts`](../web/lib/permissions.ts) |",
  "| Exam engine (timer, grading, events) | [`web/lib/server/exam.ts`](../web/lib/server/exam.ts) |",
  "",
  "## Regenerating",
  "",
  "```bash",
  "npx tsc web/lib/docs.ts --outDir /tmp/am-docs --module commonjs --target es2020 --skipLibCheck",
  "node scripts/export-docs.mjs /tmp/am-docs/docs.js",
  "```",
  "",
].join("\n");

writeFileSync(join(OUT, "README.md"), readme, "utf8");
console.log(`Wrote ${DOCS.length} documents + README to ${OUT}`);
