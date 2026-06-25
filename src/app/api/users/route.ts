import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireTenant, handleApiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export async function GET() {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_USERS);
    const tenantId = requireTenant(user);

    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_USERS);
    const tenantId = requireTenant(user);
    const { email, password, firstName, lastName, role } = await req.json();

    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    if (role === Role.SUPER_ADMIN || role === Role.ADMIN) {
      if (user.role !== Role.ADMIN) {
        return NextResponse.json({ error: "Impossible de créer ce rôle" }, { status: 403 });
      }
    }

    const allowedRoles: Role[] = [Role.SUPERVISOR, Role.AGENT];
    if (user.role === Role.ADMIN) {
      allowedRoles.push(Role.ADMIN);
    }
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Rôle non autorisé" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Cet email existe déjà" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        tenantId,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAudit({
      tenantId,
      userId: user.id,
      action: AuditAction.CREATE_USER,
      entityType: "User",
      entityId: newUser.id,
      details: { email, role },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
