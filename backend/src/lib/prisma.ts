import { PrismaClient } from "@prisma/client";
import { applyAuditExtension } from "./prismaAuditExtension";

/// Singleton del cliente Prisma con extensión de auditoría aplicada.
///
/// La extensión captura automáticamente operaciones CUD sobre entidades
/// críticas y escribe en `audit_logs`. Detalles en `prismaAuditExtension.ts`.
///
/// El cliente exportado tiene un tipo derivado (`ExtendedPrismaClient`) — los
/// módulos que importen `prisma` reciben los mismos delegates (user, contract,
/// payment, etc.) sin cambios.

type ExtendedPrismaClient = ReturnType<typeof applyAuditExtension>;

const globalForPrisma = globalThis as unknown as {
  prisma?: ExtendedPrismaClient;
};

function createClient(): ExtendedPrismaClient {
  const base = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
  return applyAuditExtension(base);
}

export const prisma: ExtendedPrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
