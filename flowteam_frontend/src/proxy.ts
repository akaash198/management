import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value || request.cookies.get("accessToken")?.value;
  const { pathname } = request.nextUrl;

  const isFrameworkAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_nextjs_font") ||
    pathname === "/favicon.ico";
  if (isFrameworkAsset) {
    return NextResponse.next();
  }

  const publicRoutes = ["/login", "/register", "/accept-invite/"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (!token && !isPublicRoute && pathname !== "/") {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_nextjs_font|favicon.ico|.*\\..*).*)"],
};