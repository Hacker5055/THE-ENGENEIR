import { NextResponse } from "next/server";
import { devCreateSession } from "@/lib/server/auth";

/** Demo session bootstrap for automated smoke tests — 404 unless explicitly enabled. */
export async function POST(req: Request) {
  // Enabled in development, or explicitly opted in for a hosted demo build.
  const enabled = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_SESSION === "1";
  if (!enabled) {
    return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 404 });
  }
  const { email } = (await req.json()) as { email?: string };
  if (!email) return NextResponse.json({ error: "EMAIL_REQUIRED" }, { status: 400 });
  const created = await devCreateSession(email);
  if (!created) return NextResponse.json({ error: "NO_USER" }, { status: 404 });
  return NextResponse.json({ ok: true, ...created });
}
