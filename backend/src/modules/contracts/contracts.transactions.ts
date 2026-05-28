import { prisma } from "../../lib/prisma";
import type { TxClient } from "../../lib/prismaTypes";
import { ConflictError, NotFoundError } from "../../utils/apiError";

/// Transacciones complejas del módulo de contratos.
///
/// Estas funciones encapsulan operaciones que deben ejecutarse atómicamente
/// (varias tablas, validaciones de negocio).

/// Reserva atómicamente un conjunto de lotes y los marca como RESERVED.
/// Falla si alguno está ya en un contrato ACTIVE o PENDING.
export async function reserveLotsForContract(
  tx: TxClient,
  lotIds: string[],
  expectedStatuses: ("AVAILABLE" | "RESERVED")[] = ["AVAILABLE"]
): Promise<void> {
  const lots = await tx.lot.findMany({
    where: { id: { in: lotIds }, deletedAt: null },
  });

  if (lots.length !== lotIds.length) {
    throw new NotFoundError("Uno o más lotes no existen");
  }
  for (const lot of lots) {
    if (!expectedStatuses.includes(lot.status as "AVAILABLE" | "RESERVED")) {
      throw new ConflictError(
        `El lote ${lot.lotNumber} no está disponible (estado actual: ${lot.status})`
      );
    }
  }

  // Validar que ninguno esté ya en un contrato activo.
  const active = await tx.contractLot.findMany({
    where: {
      lotId: { in: lotIds },
      contract: { status: { in: ["ACTIVE", "PENDING"] } },
    },
  });
  if (active.length > 0) {
    throw new ConflictError(
      "Uno o más lotes ya están en un contrato activo o pendiente"
    );
  }

  await tx.lot.updateMany({
    where: { id: { in: lotIds } },
    data: { status: "RESERVED" },
  });
}

/// Wrapper de prisma.$transaction expuesto para que el service lo use.
export function withTransaction<T>(
  fn: (tx: TxClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn);
}
