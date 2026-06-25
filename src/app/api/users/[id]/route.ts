import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireTenant, handleApiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_USERS);
    const tenantId = requireTenant(user);
    const { id } = await params;
    const body = await req.json();

    const target = await prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!target) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.firstName) updateData.firstName = body.firstName;
    if (body.lastName) updateData.lastName = body.lastName;
    if (body.role && body.role !== Role.SUPER_ADMIN) updateData.role = body.role;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.password) updateData.password = await bcrypt.hash(body.password, 12);

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
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
      action: AuditAction.UPDATE_USER,
      entityType: "User",
      entityId: id,
      details: body,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_USERS);
    const tenantId = requireTenant(user);
    const { id } = await params;

    if (id === user.id) {
      return NextResponse.json({ error: "Impossible de supprimer votre compte" }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!target) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await logAudit({
      tenantId,
      userId: user.id,
      action: AuditAction.DELETE_USER,
      entityType: "User",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
