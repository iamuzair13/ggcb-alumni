/**
 * proxy.ts (Next 16 middleware successor) — intentionally NOT the
 * authorization boundary (that's the server-side guards in
 * src/server/auth). It does exactly two cosmetic/transport things:
 *
 *  1. Forces `Cache-Control: private, no-store` on the authenticated areas
 *     so a shared cache can never serve one user's page to another.
 *  2. Optimistic UX: if there's no session cookie at all on a protected
 *     page path, bounce to /login early (saves a render). A cookie alone
 *     never grants anything — the guards still decide.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "__Host-authjs.session-token",
];

const PROTECTED_PREFIXES = ["/admin", "/dashboard", "/api/auth/me"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtected(pathname)) return NextResponse.next();

  const hasCookie = SESSION_COOKIE_NAMES.some((n) => request.cookies.has(n));
  if (!hasCookie && !pathname.startsWith("/api/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?callbackUrl=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/api/auth/me"],
};
