import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { handleApiError } from "@/lib/api-utils";
import { AuditAction } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    if (user.tenantId) {
      const parking = await prisma.parking.findUnique({ where: { tenantId: user.tenantId } });
      if (!parking || !parking.isActive) {
        return NextResponse.json(
          { error: "Parking désactivé. Contactez l'administrateur." },
          { status: 403 }
        );
      }
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
    };

    const token = await createSession(sessionUser);
    await setSessionCookie(token);

    await logAudit({
      tenantId: user.tenantId,
      userId: user.id,
      action: AuditAction.LOGIN,
      entityType: "User",
      entityId: user.id,
    });

    return NextResponse.json({ user: sessionUser });
  } catch (error) {
    return handleApiError(error);
  }
}
