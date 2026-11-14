import { NextResponse } from "next/server";
import { startSignIn } from "@/lib/server/auth";

/**
 * Demo/test harness: issues a 2FA challenge without going through the login
 * form, so the verification step can be smoke-tested with plain HTTP.
 *
 * 404 unless the demo is explicitly enabled (same guard as /api/dev/session).
 */
export async function POST(req: Request) {
  const enabled = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_SESSION === "1";
  if (!enabled) return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 404 });

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "EMAIL_AND_PASSWORD_REQUIRED" }, { status: 400 });
  }

  const result = await startSignIn(body.email, body.password);
  if (!result.ok) return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  if (result.kind === "SESSION") return NextResponse.json({ ok: true, session: true });
  return NextResponse.json({ ok: true, challengeId: result.challengeId, code: result.demoCode });
}
