import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireTenant, handleApiError } from "@/lib/api-utils";
import { PERMISSIONS, VEHICLE_TYPE_LABELS } from "@/lib/permissions";
import PDFDocument from "pdfkit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(PERMISSIONS.GENERATE_PDF);
    const tenantId = requireTenant(user);
    const { id } = await params;

    const ticket = await prisma.ticket.findFirst({
      where: { id, tenantId },
      include: {
        entryAgent: { select: { firstName: true, lastName: true } },
        exitAgent: { select: { firstName: true, lastName: true } },
        payment: { include: { agent: { select: { firstName: true, lastName: true } } } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket non trouvé" }, { status: 404 });
    }

    const parking = await prisma.parking.findUnique({ where: { tenantId } });
    const settings = await prisma.parkingSettings.findUnique({ where: { tenantId } });

    const doc = new PDFDocument({ margin: 50, size: "A5" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    doc.fontSize(16).text(parking?.name || "Smart Parking", { align: "center" });
    doc.fontSize(10).text(parking?.address || "", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text("TICKET DE PARKING", { align: "center" });
    doc.moveDown();

    doc.fontSize(11);
    doc.text(`N°: ${ticket.ticketNumber}`);
    doc.text(`Plaque: ${ticket.plate}`);
    doc.text(`Type: ${VEHICLE_TYPE_LABELS[ticket.vehicleType] || ticket.vehicleType}`);
    doc.text(`Tarif: ${ticket.rateAmount} ${settings?.currency || "FCFA"}`);
    doc.moveDown();

    doc.text(`Entrée: ${ticket.entryDate.toLocaleString("fr-FR")}`);
    doc.text(`Agent: ${ticket.entryAgent.firstName} ${ticket.entryAgent.lastName}`);

    if (ticket.exitDate) {
      doc.text(`Sortie: ${ticket.exitDate.toLocaleString("fr-FR")}`);
      if (ticket.exitAgent) {
        doc.text(`Agent sortie: ${ticket.exitAgent.firstName} ${ticket.exitAgent.lastName}`);
      }
    }

    doc.moveDown();
    doc.text(`Statut: ${ticket.status}`);
    doc.text(`Paiement: ${ticket.paymentStatus}`);

    if (ticket.payment) {
      doc.text(`Montant payé: ${ticket.payment.amount} ${settings?.currency || "FCFA"}`);
      doc.text(`Encaissé par: ${ticket.payment.agent.firstName} ${ticket.payment.agent.lastName}`);
    }

    doc.end();
    await new Promise((resolve) => doc.on("end", resolve));
    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ticket-${ticket.ticketNumber}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
