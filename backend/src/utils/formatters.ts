import { Prisma } from "@prisma/client";

/// Formatea un Decimal/number como moneda en quetzales (GTQ).
export function formatCurrency(
  value: Prisma.Decimal | number | string,
  currency = "GTQ"
): string {
  const v = new Prisma.Decimal(value).toNumber();
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(v);
}

/// Formatea una fecha como `YYYY-MM-DD`.
export function formatDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/// Genera un código secuencial con prefijo (ej: "CONT-2025-0001").
export function buildSequentialCode(
  prefix: string,
  year: number,
  sequence: number,
  pad = 4
): string {
  return `${prefix}-${year}-${String(sequence).padStart(pad, "0")}`;
}
