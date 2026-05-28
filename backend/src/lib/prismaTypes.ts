/// Tipos auxiliares derivados del cliente Prisma EXTENDIDO.
///
/// Con `prisma.$extends({...})`, el tipo `Prisma.TransactionClient` ya no
/// encaja con el cliente devuelto por `prisma.$transaction(cb)`. Exportamos
/// `TxClient` como el tipo correcto a usar en callbacks de transacción.

import type { prisma } from "./prisma";

/// Cliente de transacción derivado del prisma extendido.
/// Equivalente al "tx" que recibe `prisma.$transaction(async (tx) => ...)`.
export type TxClient = Parameters<Parameters<typeof prisma["$transaction"]>[0]>[0];
