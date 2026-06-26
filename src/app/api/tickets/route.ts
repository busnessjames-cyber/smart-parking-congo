import { NextRequest, NextResponse } from "next/server";
import { TicketStatus, VehicleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireTenant, handleApiError, ApiError } from "@/lib/api-utils";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { generateTicketNumber, logAudit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const tenantId = requireTenant(user);

    if (
      !hasPermission(user.role, PERMISSIONS.VIEW_TICKETS) &&
      !hasPermission(user.role, PERMISSIONS.VEHICLE_EXIT)
    ) {
      throw new ApiError(403, "Permission refusée");
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const vehicleType = searchParams.get("vehicleType");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Record<string, unknown> = { tenantId };

    if (status) where.status = status as TicketStatus;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (vehicleType) where.vehicleType = vehicleType as VehicleType;

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: "insensitive" } },
        { plate: { contains: search, mode: "insensitive" } },
      ];
    }

    if (dateFrom || dateTo) {
      const entryDate: Record<string, Date> = {};
      if (dateFrom) entryDate.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        entryDate.lte = end;
      }
      where.entryDate = entryDate;
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where: where as any,
        skip,
        take: limit,
        include: {
          entryAgent: { select: { firstName: true, lastName: true } },
          exitAgent: { select: { firstName: true, lastName: true } },
          payment: true,
        },
        orderBy: { entryDate: "desc" },
      }),
      prisma.ticket.count({ where: where as any }),
    ]);

    return NextResponse.json({
      tickets,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!hasPermission(user.role, PERMISSIONS.VEHICLE_ENTRY)) {
      throw new ApiError(403, "Permission refusée");
    }
    const tenantId = requireTenant(user);
    const formData = await req.formData();

    const plate = (formData.get("plate") as string)?.trim().toUpperCase();
    const vehicleType = formData.get("vehicleType") as VehicleType;
    const photo = formData.get("photo") as File | null;

    if (!plate || !vehicleType) {
      return NextResponse.json({ error: "Plaque et type requis" }, { status: 400 });
    }

    const existingInside = await prisma.ticket.findFirst({
      where: { tenantId, plate, status: TicketStatus.INSIDE },
    });

    if (existingInside) {
      return NextResponse.json(
        { error: "Un véhicule avec cette plaque est déjà dans le parking" },
        { status: 400 }
      );
    }

    const rate = await prisma.rate.findUnique({
      where: { tenantId_vehicleType: { tenantId, vehicleType } },
    });

    if (!rate) {
      return NextResponse.json({ error: "Tarif non configuré" }, { status: 400 });
    }

    let photoUrl: string | null = null;
    if (photo && photo.size > 0) {
      const bytes = await photo.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadDir = path.join(process.cwd(), "public", "uploads", tenantId);
      await mkdir(uploadDir, { recursive: true });
      const filename = `${Date.now()}-${plate.replace(/\s/g, "")}.jpg`;
      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);
      photoUrl = `/uploads/${tenantId}/${filename}`;
    }

    const ticketNumber = await generateTicketNumber(tenantId);

    const ticket = await prisma.ticket.create({
      data: {
        tenantId,
        ticketNumber,
        plate,
        vehicleType,
        rateAmount: rate.amount,
        photoUrl,
        entryAgentId: user.id,
        status: TicketStatus.INSIDE,
      },
      include: {
        entryAgent: { select: { firstName: true, lastName: true } },
      },
    });

    await logAudit({
      tenantId,
      userId: user.id,
      action: AuditAction.CREATE_TICKET,
      entityType: "Ticket",
      entityId: ticket.id,
      details: { ticketNumber, plate, vehicleType, rateAmount: rate.amount },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
