import { NextRequest, NextResponse } from "next/server";
import { getSession, SessionUser } from "./auth";
import { Role } from "@prisma/client";
import { hasPermission, Permission } from "./permissions";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new ApiError(401, "Non authentifié");
  return user;
}

export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new ApiError(403, "Accès refusé");
  }
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireAuth();
  if (!hasPermission(user.role, permission)) {
    throw new ApiError(403, "Permission refusée");
  }
  return user;
}

export function requireTenant(user: SessionUser): string {
  if (!user.tenantId) {
    throw new ApiError(403, "Tenant requis pour cette action");
  }
  return user.tenantId;
}

export function tenantFilter(user: SessionUser): { tenantId: string } | Record<string, never> {
  if (user.role === Role.SUPER_ADMIN) return {};
  if (!user.tenantId) throw new ApiError(403, "Tenant requis");
  return { tenantId: user.tenantId };
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
}

export async function withAuth(
  handler: (user: SessionUser, req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const user = await requireAuth();
      return await handler(user, req);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
