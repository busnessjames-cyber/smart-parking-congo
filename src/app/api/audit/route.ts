import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireTenant, handleApiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { startOfDay, endOfDay } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.AUDIT_LOG);
    const tenantId = requireTenant(user);
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const skip = (page - 1) * limit;
    const action = searchParams.get("action");

    const where: Record<string, unknown> = { tenantId };
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: where as any,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where: where as any }),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
