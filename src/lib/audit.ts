import { prisma } from "./prisma";
import { AuditAction } from "@prisma/client";

export async function logAudit(params: {
  tenantId?: string | null;
  userId: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId ?? null,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details ? JSON.stringify(params.details) : null,
    },
  });
}

export async function generateTicketNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();

  const settings = await prisma.parkingSettings.findUnique({
    where: { tenantId },
  });
  const prefix = settings?.ticketPrefix ?? "PK-CG";

  const counter = await prisma.$transaction(async (tx) => {
    const existing = await tx.ticketCounter.findUnique({
      where: { tenantId_year: { tenantId, year } },
    });

    if (existing) {
      return tx.ticketCounter.update({
        where: { id: existing.id },
        data: { counter: existing.counter + 1 },
      });
    }

    return tx.ticketCounter.create({
      data: { tenantId, year, counter: 1 },
    });
  });

  const padded = String(counter.counter).padStart(6, "0");
  return `${prefix}-${year}-${padded}`;
}

export function formatCurrency(amount: number, currency = "FCFA"): string {
  return `${amount.toLocaleString("fr-FR")} ${currency}`;
}
