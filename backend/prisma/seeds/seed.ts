import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ----- Usuario administrador -----
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@gestionlotes.local",
      password: adminPassword,
      fullName: "Administrador del Sistema",
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log(`✅ Usuario admin: ${admin.username}`);

  // ----- Proyecto -----
  const project = await prisma.project.upsert({
    where: { name: "La Pradera" },
    update: {},
    create: {
      name: "La Pradera",
      description: "Lotificación residencial en zona 16",
      address: "Carretera al Atlántico Km 18.5",
      isActive: true,
    },
  });
  console.log(`✅ Proyecto: ${project.name}`);

  // ----- Manzanas -----
  const blockA = await prisma.block.upsert({
    where: { projectId_name: { projectId: project.id, name: "A" } },
    update: {},
    create: {
      name: "A",
      description: "Manzana A — frente principal",
      projectId: project.id,
    },
  });
  const blockB = await prisma.block.upsert({
    where: { projectId_name: { projectId: project.id, name: "B" } },
    update: {},
    create: {
      name: "B",
      description: "Manzana B — área verde",
      projectId: project.id,
    },
  });
  console.log(`✅ Manzanas: ${blockA.name}, ${blockB.name}`);

  // ----- Lotes -----
  const lotsData: Array<{
    blockId: string;
    lotNumber: string;
    area: number;
    basePrice: number;
    isCorner?: boolean;
  }> = [
    { blockId: blockA.id, lotNumber: "1", area: 180, basePrice: 250000, isCorner: true },
    { blockId: blockA.id, lotNumber: "2", area: 160, basePrice: 220000 },
    { blockId: blockA.id, lotNumber: "3", area: 160, basePrice: 220000 },
    { blockId: blockB.id, lotNumber: "1", area: 200, basePrice: 280000 },
    { blockId: blockB.id, lotNumber: "2", area: 180, basePrice: 240000 },
  ];

  for (const lot of lotsData) {
    await prisma.lot.upsert({
      where: { blockId_lotNumber: { blockId: lot.blockId, lotNumber: lot.lotNumber } },
      update: {},
      create: {
        blockId: lot.blockId,
        lotNumber: lot.lotNumber,
        area: new Prisma.Decimal(lot.area),
        basePrice: new Prisma.Decimal(lot.basePrice),
        isCorner: lot.isCorner ?? false,
        status: "AVAILABLE",
        type: "RESIDENTIAL",
      },
    });
  }
  console.log(`✅ Lotes: ${lotsData.length}`);

  // ----- Clientes -----
  const client1 = await prisma.client.upsert({
    where: { code: "CLI-2025-0001" },
    update: {},
    create: {
      code: "CLI-2025-0001",
      fullName: "Juan Carlos Pérez López",
      address: "5a Av 12-34 Zona 1, Guatemala",
      phone: "5555-1234",
      dpi: "2345 67890 0101",
      email: "juan.perez@example.com",
      nationality: "Guatemalteca",
      maritalStatus: "MARRIED",
      housingType: "OWNED",
      profession: "Ingeniero",
      isForeign: false,
      livesAbroad: false,
    },
  });

  const client2 = await prisma.client.upsert({
    where: { code: "CLI-2025-0002" },
    update: {},
    create: {
      code: "CLI-2025-0002",
      fullName: "María Fernanda Gómez Ruiz",
      address: "10a Calle 5-67 Zona 10, Guatemala",
      phone: "5555-5678",
      dpi: "3456 78901 0101",
      email: "maria.gomez@example.com",
      nationality: "Guatemalteca",
      maritalStatus: "SINGLE",
      housingType: "RENTED",
      profession: "Contadora",
      isForeign: false,
      livesAbroad: false,
    },
  });
  console.log(`✅ Clientes: ${client1.code}, ${client2.code}`);

  // ----- Cuenta bancaria -----
  await prisma.bankAccount.upsert({
    where: { accountNumber: "001-2345678-9" },
    update: {},
    create: {
      bankName: "Banrural",
      accountNumber: "001-2345678-9",
      accountHolder: "Lotificadora La Pradera S.A.",
      accountType: "Monetaria",
      currency: "GTQ",
      isActive: true,
    },
  });
  console.log(`✅ Cuenta bancaria registrada`);

  console.log("🌱 Seed completado.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
