import * as repo from "./users.repository";
import { NotFoundError } from "../../utils/apiError";
import type { CreateUserInput, UpdateUserInput } from "./users.validators";

function toPublic(user: { password?: string; deletedAt?: Date | null } & Record<string, unknown>) {
  const { password: _password, deletedAt: _deletedAt, ...rest } = user;
  return rest;
}

export async function listUsers(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [data, total] = await repo.findUsers(skip, limit);
  return { data: data.map(toPublic), total, page, limit };
}

export async function getUserById(id: string) {
  const user = await repo.findUserById(id);
  if (!user) throw new NotFoundError("Usuario no encontrado");
  return toPublic(user);
}

export async function createUser(_input: CreateUserInput) {
  throw new Error("users.service.createUser no implementado (Fase 3).");
}

export async function updateUser(_id: string, _input: UpdateUserInput) {
  throw new Error("users.service.updateUser no implementado (Fase 3).");
}

export async function toggleActive(id: string) {
  const user = await repo.findUserById(id);
  if (!user) throw new NotFoundError("Usuario no encontrado");
  const updated = await repo.toggleActive(id, !user.isActive);
  return toPublic(updated);
}
