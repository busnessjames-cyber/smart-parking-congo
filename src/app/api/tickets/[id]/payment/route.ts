import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireTenant, handleApiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(PERMISSIONS.COLLECT_PAYMENT);
    const tenantId = requireTenant(user);
    const { id } = await params;

    const ticket = await prisma.ticket.findFirst({
      where: { id, tenantId },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket non trouvé" }, { status: 404 });
    }

    if (ticket.paymentStatus === PaymentStatus.PAID) {
      return NextResponse.json({ error: "Ticket déjà payé" }, { status: 400 });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          tenantId,
          ticketId: id,
          amount: ticket.rateAmount,
          agentId: user.id,
        },
      });

      await tx.ticket.update({
        where: { id },
        data: { paymentStatus: PaymentStatus.PAID },
      });

      return p;
    });

    await logAudit({
      tenantId,
      userId: user.id,
      action: AuditAction.CREATE_PAYMENT,
      entityType: "Payment",
      entityId: payment.id,
      details: { ticketId: id, amount: ticket.rateAmount },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
