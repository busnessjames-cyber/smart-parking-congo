import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Role } from "@prisma/client";

export default async function Home() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  if (user.role === Role.SUPER_ADMIN) {
    redirect("/super-admin");
  }

  redirect("/dashboard");
}
