import * as repo from "./contracts.repository";
import { NotFoundError } from "../../utils/apiError";
import type {
  CreateContractInput,
  UpdateContractInput,
  CancelContractInput,
  AddLotsInput,
  RemoveLotsInput,
  ContractSearchInput,
} from "./contracts.validators";

export async function listContracts(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [data, total] = await repo.findContracts(skip, limit);
  return { data, total, page, limit };
}

export async function getContractById(id: string) {
  const contract = await repo.findContractById(id);
  if (!contract) throw new NotFoundError("Contrato no encontrado");
  return contract;
}

export async function getPaymentSchedule(contractId: string) {
  return repo.findPaymentSchedule(contractId);
}

export async function createContract(_input: CreateContractInput) {
  throw new Error("contracts.service.createContract no implementado (Fase 3).");
}

export async function updateContract(_id: string, _input: UpdateContractInput) {
  throw new Error("contracts.service.updateContract no implementado (Fase 3).");
}

export async function cancelContract(_id: string, _input: CancelContractInput) {
  throw new Error("contracts.service.cancelContract no implementado (Fase 3).");
}

export async function addLots(_contractId: string, _input: AddLotsInput) {
  throw new Error("contracts.service.addLots no implementado (Fase 3).");
}

export async function removeLots(_contractId: string, _input: RemoveLotsInput) {
  throw new Error("contracts.service.removeLots no implementado (Fase 3).");
}

export async function searchContracts(_filter: ContractSearchInput) {
  throw new Error("contracts.service.searchContracts no implementado (Fase 3).");
}
