import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-utils";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole([Role.SUPER_ADMIN]);
    const { id } = await params;
    const { isActive } = await req.json();

    const parking = await prisma.parking.update({
      where: { id },
      data: { isActive },
    });

    await logAudit({
      tenantId: parking.tenantId,
      userId: user.id,
      action: AuditAction.UPDATE_PARKING,
      entityType: "Parking",
      entityId: parking.id,
      details: { isActive, name: parking.name },
    });

    return NextResponse.json(parking);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole([Role.SUPER_ADMIN]);
    const { id } = await params;

    const parking = await prisma.parking.findUnique({ where: { id } });
    if (!parking) {
      return NextResponse.json({ error: "Parking introuvable" }, { status: 404 });
    }

    await prisma.parking.update({
      where: { id },
      data: { isActive: false },
    });

    await logAudit({
      tenantId: parking.tenantId,
      userId: user.id,
      action: AuditAction.UPDATE_PARKING,
      entityType: "Parking",
      entityId: parking.id,
      details: { deleted: true, name: parking.name },
    });

    return NextResponse.json({ message: "Parking désactivé" });
  } catch (error) {
    return handleApiError(error);
  }
}
