import { prisma } from "../../lib/prisma";
import type { Prisma } from "@prisma/client";

export function findSessions(skip: number, take: number) {
  return prisma.$transaction([
    prisma.cashSession.findMany({
      skip,
      take,
      orderBy: { openedAt: "desc" },
      include: { openedBy: true, closedBy: true },
    }),
    prisma.cashSession.count(),
  ]);
}

export function findSessionById(id: string) {
  return prisma.cashSession.findUnique({
    where: { id },
    include: { openedBy: true, closedBy: true, payments: true },
  });
}

export function findActiveSession() {
  return prisma.cashSession.findFirst({
    where: { status: "OPEN" },
    include: { openedBy: true },
  });
}

export function findSessionMovements(sessionId: string) {
  return prisma.payment.findMany({
    where: { cashSessionId: sessionId },
    orderBy: { paymentDate: "asc" },
    include: { contract: { include: { client: true } } },
  });
}

export function createSession(data: Prisma.CashSessionCreateInput) {
  return prisma.cashSession.create({ data });
}

export function updateSession(id: string, data: Prisma.CashSessionUpdateInput) {
  return prisma.cashSession.update({ where: { id }, data });
}
