import { prisma } from "../../lib/prisma";
import type { Prisma } from "@prisma/client";

/// Repository — capa de acceso a datos. Encapsula queries de Prisma.
/// Los services llaman a estas funciones; los controllers nunca acceden
/// directamente a Prisma.

// ---------- Projects ----------

export function findProjects(params: { skip?: number; take?: number } = {}) {
  return prisma.project.findMany({
    skip: params.skip,
    take: params.take,
    orderBy: { createdAt: "desc" },
  });
}

export function countProjects() {
  return prisma.project.count();
}

export function findProjectById(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: { blocks: true },
  });
}

export function createProject(data: Prisma.ProjectCreateInput) {
  return prisma.project.create({ data });
}

export function updateProject(id: string, data: Prisma.ProjectUpdateInput) {
  return prisma.project.update({ where: { id }, data });
}

// ---------- Blocks ----------

export function findBlocksByProject(projectId: string) {
  return prisma.block.findMany({
    where: { projectId },
    orderBy: { name: "asc" },
  });
}

export function findBlockById(id: string) {
  return prisma.block.findUnique({
    where: { id },
    include: { lots: true, project: true },
  });
}

export function createBlock(projectId: string, data: Omit<Prisma.BlockCreateInput, "project">) {
  return prisma.block.create({
    data: { ...data, project: { connect: { id: projectId } } },
  });
}

export function updateBlock(id: string, data: Prisma.BlockUpdateInput) {
  return prisma.block.update({ where: { id }, data });
}

// ---------- Lots ----------

export function findLotsByBlock(blockId: string) {
  return prisma.lot.findMany({
    where: { blockId, deletedAt: null },
    orderBy: { lotNumber: "asc" },
  });
}

export function findLotById(id: string) {
  return prisma.lot.findFirst({
    where: { id, deletedAt: null },
    include: { block: { include: { project: true } } },
  });
}

export function createLot(blockId: string, data: Omit<Prisma.LotCreateInput, "block">) {
  return prisma.lot.create({
    data: { ...data, block: { connect: { id: blockId } } },
  });
}

export function updateLot(id: string, data: Prisma.LotUpdateInput) {
  return prisma.lot.update({ where: { id }, data });
}

export function searchLots(filter: Prisma.LotWhereInput, skip: number, take: number) {
  return prisma.$transaction([
    prisma.lot.findMany({
      where: { ...filter, deletedAt: null },
      skip,
      take,
      include: { block: { include: { project: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lot.count({ where: { ...filter, deletedAt: null } }),
  ]);
}
