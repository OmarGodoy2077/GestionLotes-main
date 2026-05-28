import { prisma } from "../../lib/prisma";
import type { Prisma } from "@prisma/client";

export function findContracts(
  skip: number,
  take: number,
  where: Prisma.ContractWhereInput = {}
) {
  return prisma.$transaction([
    prisma.contract.findMany({
      where: { ...where, deletedAt: null },
      skip,
      take,
      orderBy: { contractDate: "desc" },
      include: {
        client: true,
        gestor: true,
        contractLots: { include: { lot: true } },
      },
    }),
    prisma.contract.count({ where: { ...where, deletedAt: null } }),
  ]);
}

export function findContractById(id: string) {
  return prisma.contract.findFirst({
    where: { id, deletedAt: null },
    include: {
      client: true,
      gestor: true,
      contractLots: { include: { lot: { include: { block: { include: { project: true } } } } } },
      paymentSchedule: { orderBy: { installmentNumber: "asc" } },
      downPaymentInstallmentsList: { orderBy: { installmentNumber: "asc" } },
    },
  });
}

export function findPaymentSchedule(contractId: string) {
  return prisma.paymentSchedule.findMany({
    where: { contractId },
    orderBy: { installmentNumber: "asc" },
  });
}

/// Cuenta cuántos contratos existen en un año dado para generar el siguiente
/// número correlativo de contrato.
export function countContractsInYear(year: number) {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  return prisma.contract.count({
    where: { contractDate: { gte: start, lt: end } },
  });
}
