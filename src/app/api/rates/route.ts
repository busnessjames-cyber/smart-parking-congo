import { NextRequest, NextResponse } from "next/server";
import { VehicleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission, requireTenant, handleApiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

const VALID_VEHICLE_TYPES = Object.values(VehicleType);

export async function GET() {
  try {
    const user = await requireAuth();
    const tenantId = requireTenant(user);

    const rates = await prisma.rate.findMany({
      where: { tenantId },
      orderBy: { vehicleType: "asc" },
    });

    return NextResponse.json(rates);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_RATES);
    const tenantId = requireTenant(user);
    const { vehicleType, amount } = await req.json();

    if (!vehicleType || amount == null) {
      return NextResponse.json({ error: "Type et montant requis" }, { status: 400 });
    }

    if (!VALID_VEHICLE_TYPES.includes(vehicleType)) {
      return NextResponse.json({ error: "Type de véhicule invalide" }, { status: 400 });
    }

    const existing = await prisma.rate.findUnique({
      where: { tenantId_vehicleType: { tenantId, vehicleType: vehicleType as VehicleType } },
    });
    if (existing) {
      return NextResponse.json({ error: "Ce type de véhicule existe déjà" }, { status: 409 });
    }

    const rate = await prisma.rate.create({
      data: {
        tenantId,
        vehicleType: vehicleType as VehicleType,
        amount: Number(amount),
      },
    });

    await logAudit({
      tenantId,
      userId: user.id,
      action: AuditAction.UPDATE_RATE,
      entityType: "Rate",
      entityId: rate.id,
      details: { vehicleType, amount },
    });

    return NextResponse.json(rate, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_RATES);
    const tenantId = requireTenant(user);
    const { vehicleType, amount } = await req.json();

    if (!vehicleType || amount == null) {
      return NextResponse.json({ error: "Type et montant requis" }, { status: 400 });
    }

    if (!VALID_VEHICLE_TYPES.includes(vehicleType)) {
      return NextResponse.json({ error: "Type de véhicule invalide" }, { status: 400 });
    }

    const rate = await prisma.rate.upsert({
      where: {
        tenantId_vehicleType: {
          tenantId,
          vehicleType: vehicleType as VehicleType,
        },
      },
      update: { amount: Number(amount) },
      create: {
        tenantId,
        vehicleType: vehicleType as VehicleType,
        amount: Number(amount),
      },
    });

    await logAudit({
      tenantId,
      userId: user.id,
      action: AuditAction.UPDATE_RATE,
      entityType: "Rate",
      entityId: rate.id,
      details: { vehicleType, amount },
    });

    return NextResponse.json(rate);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_RATES);
    const tenantId = requireTenant(user);
    const { vehicleType } = await req.json();

    if (!vehicleType) {
      return NextResponse.json({ error: "Type de véhicule requis" }, { status: 400 });
    }

    if (!VALID_VEHICLE_TYPES.includes(vehicleType)) {
      return NextResponse.json({ error: "Type de véhicule invalide" }, { status: 400 });
    }

    await prisma.rate.delete({
      where: { tenantId_vehicleType: { tenantId, vehicleType: vehicleType as VehicleType } },
    });

    await logAudit({
      tenantId,
      userId: user.id,
      action: AuditAction.UPDATE_RATE,
      entityType: "Rate",
      entityId: vehicleType,
      details: { vehicleType, action: "deleted" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
