"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Car,
  LogOut,
  Users,
  DollarSign,
  FileText,
  BarChart3,
  Shield,
  Settings,
  Building2,
  Search,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";
import { useTheme } from "@/lib/use-theme";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: [Role.ADMIN, Role.SUPERVISOR, Role.AGENT],
  },
  {
    href: "/entry",
    label: "Entrée véhicule",
    icon: <Car className="h-5 w-5" />,
    roles: [Role.AGENT],
  },
  {
    href: "/exit",
    label: "Sortie véhicule",
    icon: <LogOut className="h-5 w-5" />,
    roles: [Role.AGENT],
  },
  {
    href: "/tickets",
    label: "Tickets",
    icon: <FileText className="h-5 w-5" />,
    roles: [Role.ADMIN, Role.SUPERVISOR],
  },
  {
    href: "/history",
    label: "Histo véhicule",
    icon: <Search className="h-5 w-5" />,
    roles: [Role.ADMIN, Role.SUPERVISOR, Role.AGENT],
  },
  {
    href: "/users",
    label: "Utilisateurs",
    icon: <Users className="h-5 w-5" />,
    roles: [Role.ADMIN],
  },
  {
    href: "/rates",
    label: "Tarifs",
    icon: <DollarSign className="h-5 w-5" />,
    roles: [Role.ADMIN],
  },
  {
    href: "/reports",
    label: "Rapports",
    icon: <BarChart3 className="h-5 w-5" />,
    roles: [Role.ADMIN, Role.SUPERVISOR],
  },
  {
    href: "/audit",
    label: "Audit Log",
    icon: <Shield className="h-5 w-5" />,
    roles: [Role.ADMIN, Role.SUPERVISOR],
  },
  {
    href: "/settings",
    label: "Paramètres",
    icon: <Settings className="h-5 w-5" />,
    roles: [Role.ADMIN],
  },
  {
    href: "/super-admin",
    label: "Parkings",
    icon: <Building2 className="h-5 w-5" />,
    roles: [Role.SUPER_ADMIN],
  },
];

interface SidebarProps {
  user: {
    firstName: string;
    lastName: string;
    role: Role;
    email: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const filteredItems = navItems.filter((item) => item.roles.includes(user.role));

  const nav = (
    <nav className="flex-1 space-y-1 p-4">
      {filteredItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === item.href || pathname.startsWith(item.href + "/")
              ? "bg-primary-50 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          )}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-white p-2 shadow-lg lg:hidden dark:bg-gray-900"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "flex h-screen w-64 flex-col border-r border-gray-200 bg-white transition-transform dark:border-gray-800 dark:bg-gray-900",
          "fixed left-0 top-0 z-40 lg:sticky lg:z-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-800">
          <div>
            <h1 className="text-xl font-bold text-primary-600">Smart Parking</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Congo SaaS</p>
          </div>
          <button
            onClick={toggle}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        {nav}

        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user.role}</p>
          </div>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}
