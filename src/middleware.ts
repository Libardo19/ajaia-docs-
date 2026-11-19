import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap edge redirect for pages: no cookie → /login. The cookie's signature is verified
 * server-side on every page load and API call (src/server/session.ts), so this is UX only.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.has("ajaia_session")) {
    const url = new URL("/login", req.url);
    if (req.nextUrl.pathname !== "/") url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api|_next|favicon.ico).*)"],
};
