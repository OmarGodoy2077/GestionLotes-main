import * as repo from "./cash.repository";
import { NotFoundError } from "../../utils/apiError";
import type {
  OpenCashSessionInput,
  CloseCashSessionInput,
} from "./cash.validators";

export async function listSessions(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [data, total] = await repo.findSessions(skip, limit);
  return { data, total, page, limit };
}

export async function getSessionById(id: string) {
  const session = await repo.findSessionById(id);
  if (!session) throw new NotFoundError("Sesión de caja no encontrada");
  return session;
}

export async function getActiveSession() {
  return repo.findActiveSession();
}

export async function getSessionMovements(id: string) {
  return repo.findSessionMovements(id);
}

export async function openSession(_input: OpenCashSessionInput, _userId: string) {
  throw new Error("cash.service.openSession no implementado (Fase 3).");
}

export async function closeSession(_id: string, _input: CloseCashSessionInput, _userId: string) {
  throw new Error("cash.service.closeSession no implementado (Fase 3).");
}
