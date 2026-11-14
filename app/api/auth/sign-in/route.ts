import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cookieSecure, startSignIn } from "@/lib/server/auth";

/**
 * Server-rendered sign-in endpoint.
 *
 * The primary form is a client component (progressive enhancement breaks when
 * hydration fails or a stale bundle is cached). This plain HTML endpoint keeps
 * sign-in working in those cases: `<noscript>` posts here and gets a 303.
 */
export async function POST(req: Request) {
  const origin = requestOrigin(req);
  let email = "";
  let password = "";
  let next = "";

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as { email?: string; password?: string; next?: string };
      email = body.email ?? "";
      password = body.password ?? "";
      next = body.next ?? "";
    } else {
      const form = await req.formData();
      email = String(form.get("email") ?? "");
      password = String(form.get("password") ?? "");
      next = String(form.get("next") ?? "");
    }
  } catch {
    return NextResponse.redirect(new URL("/login?expired=1", origin), 303);
  }

  const result = await startSignIn(email, password);
  if (!result.ok) {
    const code = result.error === "RATE_LIMITED" ? "rate" : "credentials";
    return NextResponse.redirect(new URL(`/login?expired=0&error=${code}`, origin), 303);
  }

  if (result.kind === "SESSION") {
    const carry = next.startsWith("/") && !next.startsWith("//") ? `?next=${encodeURIComponent(next)}` : "";
    return NextResponse.redirect(new URL(`/welcome${carry}`, origin), 303);
  }

  (await cookies()).set("am_pending", result.challengeId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 300,
    secure: await cookieSecure(),
  });

  const carry = next.startsWith("/") && !next.startsWith("//") ? `&next=${encodeURIComponent(next)}` : "";
  return NextResponse.redirect(new URL(`/verify?c=${encodeURIComponent(result.challengeId)}${carry}`, origin), 303);
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
