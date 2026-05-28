/// Re-export del singleton de Prisma. Centraliza la importación del cliente
/// para que el resto de la app importe desde `config/database` o `lib/prisma`
/// indistintamente.
export { prisma } from "../lib/prisma";
