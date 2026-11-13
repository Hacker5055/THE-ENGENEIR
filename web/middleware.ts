import { NextResponse, type NextRequest } from "next/server";

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
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  if (req.cookies.get("am_session")?.value) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*", "/exam/:path*"],
};
