import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { completeSignIn, cookieSecure, HOME_FOR_ROLE } from "@/lib/server/auth";

/**
 * Server-rendered 2FA endpoint — the `<noscript>` twin of the React form.
 * Any browser that cannot run or hydrate the client bundle can still finish
 * sign-in with a plain POST.
 */
export async function POST(req: Request) {
  const origin = requestOrigin(req);
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.redirect(new URL("/login?expired=1", origin), 303);

  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  const fromForm = String(form.get("challenge") ?? "").trim();
  const challengeId = fromForm || (await cookies()).get("am_pending")?.value || "";
  const keep = challengeId ? `?c=${encodeURIComponent(challengeId)}` : "";

  if (!challengeId) return NextResponse.redirect(new URL("/login?expired=1", origin), 303);
  if (code.length !== 6) return NextResponse.redirect(new URL(`/verify${keep}&error=short`, origin), 303);

  const result = await completeSignIn(challengeId, code);
  if (!result.ok) {
    const reason = result.error === "LOCKED" ? "locked" : result.error === "EXPIRED" ? "expired" : "invalid";
    return NextResponse.redirect(new URL(`/verify${keep}&error=${reason}`, origin), 303);
  }

  (await cookies()).delete("am_pending");
  const res = NextResponse.redirect(new URL("/welcome", origin), 303);
  // Re-assert the session cookie on this response so the redirect always
  // carries a credential, whatever the cookie jar did with `am_pending`.
  const jar = await cookies();
  const token = jar.get("am_session")?.value;
  if (token) {
    res.cookies.set("am_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: await cookieSecure(),
      path: "/",
      maxAge: 8 * 60 * 60,
    });
  }
  return res;
}

/**
 * Behind the preview proxy `req.url` points at the internal bind address;
 * absolute redirects must use the host the browser actually asked for.
 */
function requestOrigin(req: Request): string {
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}
