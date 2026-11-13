import { NextResponse, type NextRequest } from "next/server";
import { homeForRole, isRole, safeNextForRole } from "@/lib/route-guard";

/**
 * Edge guard for protected surfaces.
 *
 * Page-level `requireUser()` remains the authority (it validates the session,
 * role and permissions). This middleware only short-circuits the obvious case —
 * no session cookie at all — so an unauthenticated request gets a real 307
 * instead of a streamed 200 that redirects later via JavaScript. That matters
 * for no-JS clients, link previews and crawlers.
 */
const PROTECTED = ["/admin", "/teacher", "/student", "/exam"];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = Boolean(req.cookies.get("am_session")?.value);
  const role = req.cookies.get("am_role")?.value;

  // Post-2FA landing: decide before anything renders, so no-JS clients and
  // crawlers get a real 307 instead of a streamed shell + JS redirect.
  if (pathname === "/welcome" && session) {
    // A session without a role hint is an older cookie: let the page decide.
    if (!isRole(role)) return NextResponse.next();
    const wanted = req.nextUrl.searchParams.get("next");
    const dest = safeNextForRole(wanted, role) ?? homeForRole(role);
    return NextResponse.redirect(new URL(dest, publicOrigin(req)), 307);
  }

  // Already signed in? /login should never render a second sign-in form.
  if (pathname === "/login" && session && isRole(role)) {
    return NextResponse.redirect(new URL(homeForRole(role), publicOrigin(req)), 307);
  }

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  if (session) return NextResponse.next();

  const url = new URL(`/login?next=${encodeURIComponent(pathname + search)}`, publicOrigin(req));
  return NextResponse.redirect(url, 307);
}

/**
 * Behind the preview proxy `req.nextUrl` points at the internal 0.0.0.0:3000
 * address, which the browser cannot reach; absolute redirects must use the
 * host the browser actually asked for.
 */
function publicOrigin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || req.nextUrl.protocol.replace(":", "") || "http";
  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || req.headers.get("host") || req.nextUrl.host;
  return `${proto}://${host}`;
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*", "/exam/:path*", "/welcome", "/login"],
};
