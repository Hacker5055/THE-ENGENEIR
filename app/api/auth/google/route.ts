import { NextResponse } from "next/server";
import { HOME_FOR_ROLE, signInWithGoogleToken } from "@/lib/server/auth";
import { safeNextForRole } from "@/lib/route-guard";

export async function POST(req: Request) {
  let idToken = "";
  let next = "";
  try {
    const body = (await req.json()) as { idToken?: string; next?: string };
    idToken = body.idToken ?? "";
    next = body.next ?? "";
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
  }

  const result = await signInWithGoogleToken(idToken);
  if (!result.ok) {
    const status = result.error === "UNVERIFIED_EMAIL" ? 403 : 401;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  const dest = safeNextForRole(next, result.role) ?? HOME_FOR_ROLE[result.role];
  return NextResponse.json({ ok: true, role: result.role, redirectTo: dest });
}
