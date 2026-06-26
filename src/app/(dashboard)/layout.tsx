import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { Role } from "@prisma/client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  if (user.role === Role.SUPER_ADMIN) {
    redirect("/super-admin");
  }

  if (user.tenantId) {
    const parking = await prisma.parking.findUnique({ where: { tenantId: user.tenantId } });
    if (!parking?.isActive) {
      redirect("/login?parking_inactive=1");
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
