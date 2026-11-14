/* ============================================================================
   Canonical base URL for absolute links in e-mail (reset links, invites).
   Behind a proxy `req.url` points at the internal bind address, so the public
   host must come from the forwarded headers or explicit configuration.
   ========================================================================== */

import "server-only";
import { headers } from "next/headers";

export async function siteBaseUrl(): Promise<string> {
  const configured = process.env.AM_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    if (host) return `${proto}://${host}`;
  } catch {
    /* outside a request scope */
  }
  return "http://localhost:3000";
}
