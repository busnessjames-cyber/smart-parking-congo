import { PrismaClient, Role, VehicleType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_RATES = {
  MOTO: 500,
  VOITURE: 1000,
  CAMION: 2000,
  BUS: 3000,
};

async function main() {
  console.log("🌱 Seeding database...");

  const superAdminPassword = await bcrypt.hash("JesusChrist@@123", 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@smartparking.cg" },
    update: {},
    create: {
      email: "superadmin@smartparking.cg",
      password: superAdminPassword,
      firstName: "Super",
      lastName: "Admin",
      role: Role.SUPER_ADMIN,
      tenantId: null,
    },
  });

  console.log("✅ Super Admin:", superAdmin.email);

  const parkingA = await prisma.parking.upsert({
    where: { tenantId: "park_001" },
    update: {},
    create: {
      tenantId: "park_001",
      name: "Parking Centre-Ville",
      address: "123 Avenue de la Paix",
      city: "Brazzaville",
      settings: { create: {} },
    },
  });

  const adminPassword = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@park001.cg" },
    update: {},
    create: {
      tenantId: "park_001",
      email: "admin@park001.cg",
      password: adminPassword,
      firstName: "Jean",
      lastName: "Moukoko",
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "supervisor@park001.cg" },
    update: {},
    create: {
      tenantId: "park_001",
      email: "supervisor@park001.cg",
      password: adminPassword,
      firstName: "Marie",
      lastName: "Nguesso",
      role: Role.SUPERVISOR,
    },
  });

  await prisma.user.upsert({
    where: { email: "agent@park001.cg" },
    update: {},
    create: {
      tenantId: "park_001",
      email: "agent@park001.cg",
      password: adminPassword,
      firstName: "Paul",
      lastName: "Kimbou",
      role: Role.AGENT,
    },
  });

  for (const [type, amount] of Object.entries(DEFAULT_RATES)) {
    await prisma.rate.upsert({
      where: {
        tenantId_vehicleType: {
          tenantId: "park_001",
          vehicleType: type as VehicleType,
        },
      },
      update: { amount },
      create: {
        tenantId: "park_001",
        vehicleType: type as VehicleType,
        amount,
      },
    });
  }

  console.log("✅ Parking A (park_001) créé avec admin, superviseur et agent");

  const parkingB = await prisma.parking.upsert({
    where: { tenantId: "park_002" },
    update: {},
    create: {
      tenantId: "park_002",
      name: "Parking Aéroport",
      address: "Aéroport Maya-Maya",
      city: "Brazzaville",
      settings: { create: {} },
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@park002.cg" },
    update: {},
    create: {
      tenantId: "park_002",
      email: "admin@park002.cg",
      password: adminPassword,
      firstName: "Sophie",
      lastName: "Mbemba",
      role: Role.ADMIN,
    },
  });

  for (const [type, amount] of Object.entries(DEFAULT_RATES)) {
    await prisma.rate.upsert({
      where: {
        tenantId_vehicleType: {
          tenantId: "park_002",
          vehicleType: type as VehicleType,
        },
      },
      update: { amount },
      create: {
        tenantId: "park_002",
        vehicleType: type as VehicleType,
        amount,
      },
    });
  }

  console.log("✅ Parking B (park_002) créé");

  console.log("\n📋 Comptes de test:");
  console.log("  Super Admin: superadmin@smartparking.cg / JesusChrist@@123");
  console.log("  Admin park_001: admin@park001.cg / admin123");
  console.log("  Superviseur: supervisor@park001.cg / admin123");
  console.log("  Agent: agent@park001.cg / admin123");
  console.log("  Admin park_002: admin@park002.cg / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
