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
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.name !== undefined) data.name = body.name;
    if (body.address !== undefined) data.address = body.address;
    if (body.city !== undefined) data.city = body.city;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 });
    }

    const parking = await prisma.parking.update({
      where: { id },
      data,
    });

    await logAudit({
      tenantId: parking.tenantId,
      userId: user.id,
      action: AuditAction.UPDATE_PARKING,
      entityType: "Parking",
      entityId: parking.id,
      details: data,
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
