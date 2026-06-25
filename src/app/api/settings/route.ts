import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireTenant, handleApiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export async function GET() {
  try {
    const user = await requirePermission(PERMISSIONS.SETTINGS);
    const tenantId = requireTenant(user);

    const settings = await prisma.parkingSettings.findUnique({
      where: { tenantId },
    });

    const parking = await prisma.parking.findUnique({
      where: { tenantId },
      select: { name: true, address: true, city: true },
    });

    return NextResponse.json({ settings, parking });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.SETTINGS);
    const tenantId = requireTenant(user);
    const body = await req.json();

    const settings = await prisma.parkingSettings.update({
      where: { tenantId },
      data: {
        ticketPrefix: body.ticketPrefix,
        currency: body.currency,
        whatsappEnabled: body.whatsappEnabled,
      },
    });

    if (body.name || body.address || body.city) {
      await prisma.parking.update({
        where: { tenantId },
        data: {
          name: body.name,
          address: body.address,
          city: body.city,
        },
      });
    }

    await logAudit({
      tenantId,
      userId: user.id,
      action: AuditAction.UPDATE_SETTINGS,
      entityType: "ParkingSettings",
      entityId: settings.id,
      details: body,
    });

    return NextResponse.json(settings);
  } catch (error) {
    return handleApiError(error);
  }
}
