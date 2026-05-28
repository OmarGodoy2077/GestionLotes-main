import { prisma } from "../../lib/prisma";
import type { Prisma } from "@prisma/client";

export function findClients(skip: number, take: number, where: Prisma.ClientWhereInput = {}) {
  return prisma.$transaction([
    prisma.client.findMany({
      where: { ...where, deletedAt: null },
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { occupation: true },
    }),
    prisma.client.count({ where: { ...where, deletedAt: null } }),
  ]);
}

export function findClientById(id: string) {
  return prisma.client.findFirst({
    where: { id, deletedAt: null },
    include: { occupation: true, gestors: { include: { gestor: true } } },
  });
}

export function findClientByDpi(dpi: string) {
  return prisma.client.findFirst({ where: { dpi, deletedAt: null } });
}

export function createClient(data: Prisma.ClientCreateInput) {
  return prisma.client.create({ data });
}

export function updateClient(id: string, data: Prisma.ClientUpdateInput) {
  return prisma.client.update({ where: { id }, data });
}

export function softDeleteClient(id: string) {
  return prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
}

// ---------- Gestor / ClientGestor ----------

export function findGestorsByClient(clientId: string) {
  return prisma.clientGestor.findMany({
    where: { clientId },
    include: { gestor: true },
    orderBy: { createdAt: "desc" },
  });
}

export function createGestor(data: Prisma.GestorCreateInput) {
  return prisma.gestor.create({ data });
}

export function linkGestorToClient(clientId: string, gestorId: string) {
  return prisma.clientGestor.create({
    data: { clientId, gestorId },
  });
}
