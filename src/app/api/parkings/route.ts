import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role, VehicleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-utils";
import { logAudit } from "@/lib/audit";
import { DEFAULT_RATES } from "@/lib/permissions";
import { AuditAction } from "@prisma/client";

export async function GET() {
  try {
    await requireRole([Role.SUPER_ADMIN]);
    const parkings = await prisma.parking.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, tickets: true } },
      },
    });
    return NextResponse.json(parkings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole([Role.SUPER_ADMIN]);
    const { name, address, city, tenantId, adminEmail, adminPassword, adminFirstName, adminLastName } =
      await req.json();

    if (!name || !tenantId || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Nom, tenantId, email et mot de passe admin requis" },
        { status: 400 }
      );
    }

    const existing = await prisma.parking.findUnique({ where: { tenantId } });
    if (existing) {
      return NextResponse.json({ error: "Ce tenantId existe déjà" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      return NextResponse.json({ error: "Cet email existe déjà" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const parking = await prisma.$transaction(async (tx) => {
      const p = await tx.parking.create({
        data: {
          tenantId,
          name,
          address,
          city,
          settings: {
            create: {},
          },
        },
      });

      await tx.user.create({
        data: {
          tenantId,
          email: adminEmail,
          password: hashedPassword,
          firstName: adminFirstName || "Admin",
          lastName: adminLastName || name,
          role: Role.ADMIN,
        },
      });

      for (const [type, amount] of Object.entries(DEFAULT_RATES)) {
        await tx.rate.create({
          data: {
            tenantId,
            vehicleType: type as VehicleType,
            amount,
          },
        });
      }

      return p;
    });

    await logAudit({
      tenantId: tenantId,
      userId: user.id,
      action: AuditAction.CREATE_PARKING,
      entityType: "Parking",
      entityId: parking.id,
      details: { name, tenantId },
    });

    return NextResponse.json(parking, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
