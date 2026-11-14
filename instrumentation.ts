/* ============================================================================
   Startup work: housekeeping + configuration validation.
   Next calls `register()` once per server process, before the first request.
   ========================================================================== */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { purgeExpiredAuthRows } = await import("./lib/server/auth");
  const { demoMode, flushNow } = await import("./lib/server/store");
  const { mailConfigured } = await import("./lib/server/mail");
  const { databasePath } = await import("./lib/server/persistence/database");

  try {
    purgeExpiredAuthRows();
  } catch (error) {
    console.error("[startup] auth housekeeping failed", error);
  }

  // A production instance without demo data must say how it is configured.
  if (!demoMode() && process.env.NEXT_PHASE !== "phase-production-build") {
    try {
      const { assertProductionConfig } = await import("./lib/server/bootstrap");
      assertProductionConfig();
      console.log(`[startup] production mode · database: ${databasePath()} · mail: ${mailConfigured() ? "configured" : "not configured"}`);
    } catch (error) {
      console.error(
        "\n==============================================================\n" +
          "  المنصة لم تُهيّأ بعد / platform not configured\n" +
          "  " + (error instanceof Error ? error.message : String(error)) +
          "\n  للتجربة فقط: AM_DEMO_MODE=1   ·   راجع .env.example\n" +
          "==============================================================\n",
      );
      throw error;
    }
  } else {
    console.log(`[startup] demo mode · database: ${databasePath()} · mail: ${mailConfigured() ? "configured" : "not configured"}`);
  }

  // Make sure a pending write is not lost when the process is asked to stop.
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      try {
        flushNow();
      } finally {
        process.exit(0);
      }
    });
  }
}
