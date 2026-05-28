import { prisma } from "../../lib/prisma";
import type { Prisma } from "@prisma/client";

export function findUsers(skip: number, take: number) {
  return prisma.$transaction([
    prisma.user.findMany({
      where: { deletedAt: null },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where: { deletedAt: null } }),
  ]);
}

export function findUserById(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null } });
}

export function findUserByUsername(username: string) {
  return prisma.user.findFirst({ where: { username, deletedAt: null } });
}

export function createUser(data: Prisma.UserCreateInput) {
  return prisma.user.create({ data });
}

export function updateUser(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({ where: { id }, data });
}

export function toggleActive(id: string, isActive: boolean) {
  return prisma.user.update({ where: { id }, data: { isActive } });
}
