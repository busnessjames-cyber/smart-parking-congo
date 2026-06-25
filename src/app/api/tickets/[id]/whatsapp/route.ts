import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireTenant, handleApiError } from "@/lib/api-utils";
import { PERMISSIONS, VEHICLE_TYPE_LABELS } from "@/lib/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(PERMISSIONS.SHARE_WHATSAPP);
    const tenantId = requireTenant(user);
    const { id } = await params;

    const ticket = await prisma.ticket.findFirst({
      where: { id, tenantId },
      include: {
        entryAgent: { select: { firstName: true, lastName: true } },
        payment: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket non trouvé" }, { status: 404 });
    }

    const parking = await prisma.parking.findUnique({ where: { tenantId } });
    const settings = await prisma.parkingSettings.findUnique({ where: { tenantId } });

    const message = [
      `🅿️ ${parking?.name || "Smart Parking"}`,
      `━━━━━━━━━━━━━━━`,
      `📋 Ticket: ${ticket.ticketNumber}`,
      `🚗 Plaque: ${ticket.plate}`,
      `🔧 Type: ${VEHICLE_TYPE_LABELS[ticket.vehicleType]}`,
      `💰 Tarif: ${ticket.rateAmount} ${settings?.currency || "FCFA"}`,
      `📅 Entrée: ${ticket.entryDate.toLocaleString("fr-FR")}`,
      `👤 Agent: ${ticket.entryAgent.firstName} ${ticket.entryAgent.lastName}`,
      `📊 Statut: ${ticket.status}`,
      `💳 Paiement: ${ticket.paymentStatus}`,
      ticket.payment ? `✅ Montant payé: ${ticket.payment.amount} FCFA` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    return NextResponse.json({ message, whatsappUrl });
  } catch (error) {
    return handleApiError(error);
  }
}
