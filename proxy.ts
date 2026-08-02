import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, verifyAccessToken } from "@/lib/auth";

const protectedPaths = ["/dashboard", "/dashboard/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifyAccessToken(token) : null;

  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname === "/dashboard" && !request.nextUrl.searchParams.has("mobile")) {
    if (user.role === "admin") {
      return NextResponse.redirect(new URL("/dashboard/admin", request.url));
    }
    if (user.role === "instructor") {
      return NextResponse.redirect(
        new URL("/dashboard/admin/classes", request.url),
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
