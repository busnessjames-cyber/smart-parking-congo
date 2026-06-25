import { Role } from "@prisma/client";

export const PERMISSIONS = {
  MANAGE_USERS: "manage_users",
  MANAGE_RATES: "manage_rates",
  VIEW_TICKETS: "view_tickets",
  REPORTS: "reports",
  SETTINGS: "settings",
  AUDIT_LOG: "audit_log",
  DASHBOARD: "dashboard",
  VEHICLE_ENTRY: "vehicle_entry",
  VEHICLE_EXIT: "vehicle_exit",
  COLLECT_PAYMENT: "collect_payment",
  GENERATE_PDF: "generate_pdf",
  SHARE_WHATSAPP: "share_whatsapp",
  MANAGE_PARKINGS: "manage_parkings",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [PERMISSIONS.MANAGE_PARKINGS],
  ADMIN: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_RATES,
    PERMISSIONS.VIEW_TICKETS,
    PERMISSIONS.REPORTS,
    PERMISSIONS.SETTINGS,
    PERMISSIONS.AUDIT_LOG,
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.GENERATE_PDF,
    PERMISSIONS.SHARE_WHATSAPP,
  ],
  SUPERVISOR: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.REPORTS,
    PERMISSIONS.VIEW_TICKETS,
    PERMISSIONS.AUDIT_LOG,
    PERMISSIONS.GENERATE_PDF,
  ],
  AGENT: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.VEHICLE_ENTRY,
    PERMISSIONS.VEHICLE_EXIT,
    PERMISSIONS.COLLECT_PAYMENT,
    PERMISSIONS.GENERATE_PDF,
    PERMISSIONS.SHARE_WHATSAPP,
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canViewGlobalRevenue(role: Role): boolean {
  return role === Role.ADMIN || role === Role.SUPERVISOR || role === Role.SUPER_ADMIN;
}

export function canViewAgentActivity(role: Role): boolean {
  return role === Role.ADMIN;
}

export function canViewOwnRevenueOnly(role: Role): boolean {
  return role === Role.AGENT;
}

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  MOTO: "Moto",
  VOITURE: "Voiture",
  CAMION: "Camion",
  BUS: "Bus",
};

export const DEFAULT_RATES = {
  MOTO: 500,
  VOITURE: 1000,
  CAMION: 2000,
  BUS: 3000,
} as const;
