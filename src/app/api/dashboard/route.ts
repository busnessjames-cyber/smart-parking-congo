import { NextRequest, NextResponse } from "next/server";
import { Role, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireTenant, handleApiError } from "@/lib/api-utils";
import { canViewGlobalRevenue, canViewAgentActivity } from "@/lib/permissions";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const tenantId = user.role === Role.SUPER_ADMIN ? null : requireTenant(user);
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    if (!tenantId && user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Tenant requis" }, { status: 403 });
    }

    const baseWhere = tenantId ? { tenantId } : {};

    const vehiclesPresent = await prisma.ticket.count({
      where: { ...baseWhere, status: TicketStatus.INSIDE },
    });

    const totalCapacity = 50; // default - could be made configurable
    const occupancyRate = totalCapacity > 0 ? Math.round((vehiclesPresent / totalCapacity) * 100) : 0;

    const entriesToday = await prisma.ticket.count({
      where: { ...baseWhere, entryDate: { gte: todayStart, lte: todayEnd } },
    });

    const exitsToday = await prisma.ticket.count({
      where: { ...baseWhere, exitDate: { gte: todayStart, lte: todayEnd } },
    });

    const response: Record<string, unknown> = {
      vehiclesPresent,
      occupancyRate,
      totalCapacity,
      entriesToday,
      exitsToday,
    };

    // Daily entries for the past 7 days (chart data)
    const dailyEntries: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = startOfDay(d);
      const dayEnd = endOfDay(d);
      const count = await prisma.ticket.count({
        where: { ...baseWhere, entryDate: { gte: dayStart, lte: dayEnd } },
      });
      dailyEntries.push({
        date: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
        count,
      });
    }
    response.dailyEntries = dailyEntries;

    // Hourly entries today (for chart)
    const hourlyActivity: { hour: string; count: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const hourStart = new Date(todayStart);
      hourStart.setHours(h);
      const hourEnd = new Date(todayStart);
      hourEnd.setHours(h + 1);
      const count = await prisma.ticket.count({
        where: {
          ...baseWhere,
          entryDate: { gte: hourStart, lte: hourEnd },
        },
      });
      hourlyActivity.push({
        hour: `${String(h).padStart(2, "0")}h`,
        count,
      });
    }
    response.hourlyActivity = hourlyActivity;

    // Vehicle distribution
    const vehiclesByType = await prisma.ticket.groupBy({
      by: ["vehicleType"],
      where: { ...baseWhere, entryDate: { gte: todayStart, lte: todayEnd } },
      _count: true,
    });
    response.vehiclesByType = vehiclesByType;

    // Agent/Agent only: my collections today
    if (user.role === Role.AGENT) {
      const myPaymentsToday = await prisma.payment.aggregate({
        where: {
          ...(tenantId ? { tenantId } : {}),
          agentId: user.id,
          paidAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { amount: true },
        _count: true,
      });
      response.myCollectionsToday = myPaymentsToday._sum.amount ?? 0;
      response.myPaymentsCountToday = myPaymentsToday._count;
    }

    // Revenue data for supervisors and admins
    if (canViewGlobalRevenue(user.role) && tenantId) {
      const revenueToday = await prisma.payment.aggregate({
        where: { tenantId, paidAt: { gte: todayStart, lte: todayEnd } },
        _sum: { amount: true },
        _count: true,
      });
      const revenueMonth = await prisma.payment.aggregate({
        where: { tenantId, paidAt: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
        _count: true,
      });

      response.revenueToday = revenueToday._sum.amount ?? 0;
      response.paymentsToday = revenueToday._count;
      response.revenueMonth = revenueMonth._sum.amount ?? 0;
      response.paymentsMonth = revenueMonth._count;

      // Daily revenue for past 7 days
      const dailyRevenue: { date: string; amount: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayStart = startOfDay(d);
        const dayEnd = endOfDay(d);
        const rev = await prisma.payment.aggregate({
          where: { tenantId, paidAt: { gte: dayStart, lte: dayEnd } },
          _sum: { amount: true },
        });
        dailyRevenue.push({
          date: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
          amount: rev._sum.amount ?? 0,
        });
      }
      response.dailyRevenue = dailyRevenue;
    }

    // Agent activity (admin only)
    if (canViewAgentActivity(user.role) && tenantId) {
      const agentActivity = await prisma.payment.groupBy({
        by: ["agentId"],
        where: { tenantId, paidAt: { gte: todayStart, lte: todayEnd } },
        _sum: { amount: true },
        _count: true,
      });

      const agentIds = agentActivity.map((a) => a.agentId);
      const agents = await prisma.user.findMany({
        where: { id: { in: agentIds } },
        select: { id: true, firstName: true, lastName: true },
      });

      response.agentActivity = agentActivity.map((a) => ({
        agent: agents.find((ag) => ag.id === a.agentId),
        totalAmount: a._sum.amount ?? 0,
        count: a._count,
      }));

      // Tickets by type today
      const ticketsByType = await prisma.ticket.groupBy({
        by: ["vehicleType"],
        where: { tenantId, entryDate: { gte: todayStart, lte: todayEnd } },
        _count: true,
      });
      response.ticketsByType = ticketsByType;
    }

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error);
  }
}
