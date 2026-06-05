import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
]);

const PUBLIC_PREFIXES = [
  "/accept-invite/",
  "/company-invite/",
  "/view/",
  "/_next/",
  "/favicon",
  "/logo",
  "/api/",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets unconditionally.
  if (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // Only guard routes inside the (app) group (everything except auth/public paths).
  // The access_token httpOnly cookie is set by the backend on login.
  const token = request.cookies.get("access_token")?.value;

  if (!token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // Preserve the intended destination so the user lands there after login.
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon, logo, public root files
     * - /api routes (backend-proxied or Next.js API routes)
     */
    "/((?!_next/static|_next/image|favicon|logo|api/).*)",
  ],
};
