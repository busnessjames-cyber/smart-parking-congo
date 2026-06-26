import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user.tenantId) return NextResponse.json({ isActive: true });
    const parking = await prisma.parking.findUnique({ where: { tenantId: user.tenantId } });
    return NextResponse.json({ isActive: parking?.isActive ?? true });
  } catch (error) {
    return handleApiError(error);
  }
}
