import { NextRequest, NextResponse } from "next/server";
import { TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireTenant, handleApiError, ApiError } from "@/lib/api-utils";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenantId = requireTenant(user);

    if (
      !hasPermission(user.role, PERMISSIONS.VIEW_TICKETS) &&
      !hasPermission(user.role, PERMISSIONS.VEHICLE_EXIT)
    ) {
      throw new ApiError(403, "Permission refusée");
    }

    const { id } = await params;

    const ticket = await prisma.ticket.findFirst({
      where: { id, tenantId },
      include: {
        entryAgent: { select: { firstName: true, lastName: true } },
        exitAgent: { select: { firstName: true, lastName: true } },
        payment: {
          include: { agent: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket non trouvé" }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!hasPermission(user.role, PERMISSIONS.VEHICLE_EXIT)) {
      throw new ApiError(403, "Permission refusée");
    }
    const tenantId = requireTenant(user);
    const { id } = await params;
    const { action } = await req.json();

    const ticket = await prisma.ticket.findFirst({
      where: { id, tenantId },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket non trouvé" }, { status: 404 });
    }

    if (ticket.status === TicketStatus.CLOSED) {
      return NextResponse.json({ error: "Ticket déjà fermé" }, { status: 400 });
    }

    if (action === "authorize_exit") {
      const updated = await prisma.ticket.update({
        where: { id },
        data: {
          status: TicketStatus.CLOSED,
          exitDate: new Date(),
          exitAgentId: user.id,
        },
        include: {
          entryAgent: { select: { firstName: true, lastName: true } },
          exitAgent: { select: { firstName: true, lastName: true } },
        },
      });

      await logAudit({
        tenantId,
        userId: user.id,
        action: AuditAction.AUTHORIZE_EXIT,
        entityType: "Ticket",
        entityId: id,
        details: { ticketNumber: ticket.ticketNumber },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
