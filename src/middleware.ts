import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { Role } from "@prisma/client";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-secret-change-in-production"
);

const publicPaths = ["/login", "/api/auth/login"];

const roleRoutes: Record<string, Role[]> = {
  "/super-admin": [Role.SUPER_ADMIN],
  "/dashboard": [Role.ADMIN, Role.SUPERVISOR, Role.AGENT],
  "/entry": [Role.AGENT],
  "/exit": [Role.AGENT],
  "/users": [Role.ADMIN],
  "/rates": [Role.ADMIN],
  "/tickets": [Role.ADMIN, Role.SUPERVISOR],
  "/reports": [Role.ADMIN, Role.SUPERVISOR],
  "/audit": [Role.ADMIN, Role.SUPERVISOR],
  "/settings": [Role.ADMIN],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/favicon") ||
    publicPaths.some((p) => pathname === p) ||
    pathname.startsWith("/api/auth/login")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("smart-parking-session")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const user = payload.user as { role: Role };

    if (pathname === "/") {
      if (user.role === Role.SUPER_ADMIN) {
        return NextResponse.redirect(new URL("/super-admin", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    for (const [route, roles] of Object.entries(roleRoutes)) {
      if (pathname.startsWith(route) && !roles.includes(user.role)) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
