import { prisma } from "../../lib/prisma";
import type { TxClient } from "../../lib/prismaTypes";

/// Transacciones complejas del módulo de pagos.
/// - Registrar un pago debe (atómicamente):
///     1. Crear el Payment
///     2. Crear las PaymentApplication
///     3. Actualizar las cuotas (paidAmount, status, paidAt)
///     4. Si excede, sumar a Contract.creditBalance
///     5. Si isAdvancePayment, recalcular el PaymentSchedule
///     6. Si el método es CASH, asociar a la CashSession abierta
///     7. Registrar AuditLog
///
/// Stub para Fase 3.

export function withTransaction<T>(
  fn: (tx: TxClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn);
}
