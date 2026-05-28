import * as repo from "./clients.repository";
import { NotFoundError } from "../../utils/apiError";
import type {
  CreateClientInput,
  UpdateClientInput,
  CreateGestorInput,
  ClientSearchInput,
} from "./clients.validators";

export async function listClients(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [data, total] = await repo.findClients(skip, limit);
  return { data, total, page, limit };
}

export async function getClientById(id: string) {
  const client = await repo.findClientById(id);
  if (!client) throw new NotFoundError("Cliente no encontrado");
  return client;
}

export async function createClient(_input: CreateClientInput) {
  throw new Error("clients.service.createClient no implementado (Fase 3).");
}

export async function updateClient(_id: string, _input: UpdateClientInput) {
  throw new Error("clients.service.updateClient no implementado (Fase 3).");
}

export async function listGestors(clientId: string) {
  return repo.findGestorsByClient(clientId);
}

export async function addGestor(_clientId: string, _input: CreateGestorInput) {
  throw new Error("clients.service.addGestor no implementado (Fase 3).");
}

export async function searchClients(_filter: ClientSearchInput) {
  throw new Error("clients.service.searchClients no implementado (Fase 3).");
}
