import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireTenant, handleApiError } from "@/lib/api-utils";
import { PERMISSIONS, VEHICLE_TYPE_LABELS } from "@/lib/permissions";
import { startOfDay, endOfDay } from "@/lib/utils";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.REPORTS);
    const tenantId = requireTenant(user);
    const { searchParams } = new URL(req.url);

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const agentId = searchParams.get("agentId");
    const vehicleType = searchParams.get("vehicleType");
    const format = searchParams.get("format");

    const where = {
      tenantId,
      ...(startDate && endDate
        ? {
            entryDate: {
              gte: startOfDay(new Date(startDate)),
              lte: endOfDay(new Date(endDate)),
            },
          }
        : {}),
      ...(agentId ? { entryAgentId: agentId } : {}),
      ...(vehicleType ? { vehicleType } : {}),
    };

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        entryAgent: { select: { firstName: true, lastName: true } },
        exitAgent: { select: { firstName: true, lastName: true } },
        payment: { include: { agent: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { entryDate: "desc" },
    });

    const summary = {
      totalTickets: tickets.length,
      totalRevenue: tickets.reduce((sum, t) => sum + (t.payment?.amount ?? 0), 0),
      paidTickets: tickets.filter((t) => t.paymentStatus === "PAID").length,
      unpaidTickets: tickets.filter((t) => t.paymentStatus === "UNPAID").length,
    };

    if (format === "csv") {
      const header = "N° Ticket,Plaque,Type,Tarif,Entrée,Sortie,Agent entrée,Agent sortie,Statut,Paiement,Montant payé\n";
      const rows = tickets.map((t) =>
        [
          t.ticketNumber,
          t.plate,
          VEHICLE_TYPE_LABELS[t.vehicleType] || t.vehicleType,
          t.rateAmount,
          t.entryDate.toLocaleString("fr-FR"),
          t.exitDate?.toLocaleString("fr-FR") || "",
          `${t.entryAgent.firstName} ${t.entryAgent.lastName}`,
          t.exitAgent ? `${t.exitAgent.firstName} ${t.exitAgent.lastName}` : "",
          t.status,
          t.paymentStatus,
          t.payment?.amount ?? 0,
        ].join(",")
      );
      const csv = header + rows.join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="rapport-${tenantId}.csv"`,
        },
      });
    }

    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Rapport");

      sheet.columns = [
        { header: "N° Ticket", key: "ticketNumber", width: 20 },
        { header: "Plaque", key: "plate", width: 15 },
        { header: "Type", key: "vehicleType", width: 12 },
        { header: "Tarif", key: "rateAmount", width: 10 },
        { header: "Entrée", key: "entryDate", width: 20 },
        { header: "Sortie", key: "exitDate", width: 20 },
        { header: "Agent entrée", key: "entryAgent", width: 20 },
        { header: "Statut", key: "status", width: 10 },
        { header: "Paiement", key: "paymentStatus", width: 10 },
        { header: "Montant payé", key: "paidAmount", width: 12 },
      ];

      tickets.forEach((t) => {
        sheet.addRow({
          ticketNumber: t.ticketNumber,
          plate: t.plate,
          vehicleType: VEHICLE_TYPE_LABELS[t.vehicleType] || t.vehicleType,
          rateAmount: t.rateAmount,
          entryDate: t.entryDate.toLocaleString("fr-FR"),
          exitDate: t.exitDate?.toLocaleString("fr-FR") || "-",
          entryAgent: `${t.entryAgent.firstName} ${t.entryAgent.lastName}`,
          status: t.status,
          paymentStatus: t.paymentStatus,
          paidAmount: t.payment?.amount ?? 0,
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="rapport-${tenantId}.xlsx"`,
        },
      });
    }

    if (format === "pdf") {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));

      doc.fontSize(18).text("Rapport de Parking", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Tenant: ${tenantId}`);
      if (startDate) doc.text(`Période: ${startDate} - ${endDate}`);
      doc.moveDown();

      doc.text(`Total tickets: ${summary.totalTickets}`);
      doc.text(`Recettes: ${summary.totalRevenue} FCFA`);
      doc.text(`Payés: ${summary.paidTickets} | Non payés: ${summary.unpaidTickets}`);
      doc.moveDown();

      tickets.slice(0, 50).forEach((t) => {
        doc
          .fontSize(10)
          .text(
            `${t.ticketNumber} | ${t.plate} | ${t.vehicleType} | ${t.rateAmount} FCFA | ${t.paymentStatus}`
          );
      });

      doc.end();

      await new Promise((resolve) => doc.on("end", resolve));
      const pdfBuffer = Buffer.concat(chunks);

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="rapport-${tenantId}.pdf"`,
        },
      });
    }

    return NextResponse.json({ tickets, summary });
  } catch (error) {
    return handleApiError(error);
  }
}
