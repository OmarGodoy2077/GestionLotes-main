import { prisma } from "../../lib/prisma";
import type { Prisma } from "@prisma/client";

export function findPaymentsByContract(contractId: string) {
  return prisma.payment.findMany({
    where: { contractId },
    orderBy: { paymentDate: "desc" },
    include: { applications: true, bankAccount: true },
  });
}

export function findPaymentById(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: {
      contract: { include: { client: true } },
      applications: { include: { schedule: true } },
      bankAccount: true,
    },
  });
}

export function searchPayments(
  filter: Prisma.PaymentWhereInput,
  skip: number,
  take: number
) {
  return prisma.$transaction([
    prisma.payment.findMany({
      where: filter,
      skip,
      take,
      orderBy: { paymentDate: "desc" },
      include: { contract: { include: { client: true } } },
    }),
    prisma.payment.count({ where: filter }),
  ]);
}

/// Para generar el siguiente número de recibo correlativo del año.
export function countPaymentsInYear(year: number) {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  return prisma.payment.count({
    where: { paymentDate: { gte: start, lt: end } },
  });
}
