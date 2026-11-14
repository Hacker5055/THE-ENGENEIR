/* Liveness/readiness probe: no secrets, no auth — safe for orchestrators. */

import { NextResponse } from "next/server";
import { sqlite, databasePath } from "@/lib/server/persistence/database";
import { demoMode } from "@/lib/server/store";
import { mailConfigured } from "@/lib/server/mail";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  let database = "ok";
  let documents = 0;
  try {
    const rows = sqlite().prepare("SELECT COUNT(*) AS n FROM documents").get() as { n: number };
    documents = Number(rows?.n ?? 0);
    sqlite().prepare("SELECT 1").get();
  } catch (error) {
    database = error instanceof Error ? error.message : "unavailable";
  }

  const healthy = database === "ok";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      time: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      latencyMs: Date.now() - started,
      database: { status: database, engine: "sqlite", documents, file: databasePath() },
      mail: mailConfigured() ? "configured" : "not-configured",
      mode: demoMode() ? "demo" : "production",
    },
    { status: healthy ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
