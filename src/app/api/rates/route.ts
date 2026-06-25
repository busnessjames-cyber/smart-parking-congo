import { NextRequest, NextResponse } from "next/server";
import { VehicleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireTenant, handleApiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export async function GET() {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_RATES);
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

export async function PUT(req: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_RATES);
    const tenantId = requireTenant(user);
    const { vehicleType, amount } = await req.json();

    if (!vehicleType || !amount) {
      return NextResponse.json({ error: "Type et montant requis" }, { status: 400 });
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
