import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { handleApiError } from "@/lib/api-utils";

export async function POST() {
  try {
    const user = await getSession();
    if (user) {
      await logAudit({
        tenantId: user.tenantId,
        userId: user.id,
        action: AuditAction.LOGOUT,
        entityType: "User",
        entityId: user.id,
      });
    }
    await clearSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
