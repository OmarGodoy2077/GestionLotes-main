import * as repo from "./projects.repository";
import { NotFoundError } from "../../utils/apiError";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateBlockInput,
  UpdateBlockInput,
  CreateLotInput,
  UpdateLotInput,
  LotSearchInput,
} from "./projects.validators";

// ---------- Projects ----------

export async function listProjects(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    repo.findProjects({ skip, take: limit }),
    repo.countProjects(),
  ]);
  return { data, total, page, limit };
}

export async function getProjectById(id: string) {
  const project = await repo.findProjectById(id);
  if (!project) throw new NotFoundError("Proyecto no encontrado");
  return project;
}

export async function createProject(_input: CreateProjectInput) {
  throw new Error("projects.service.createProject no implementado (Fase 3).");
}

export async function updateProject(_id: string, _input: UpdateProjectInput) {
  throw new Error("projects.service.updateProject no implementado (Fase 3).");
}

// ---------- Blocks ----------

export async function listBlocksByProject(projectId: string) {
  return repo.findBlocksByProject(projectId);
}

export async function createBlock(_projectId: string, _input: CreateBlockInput) {
  throw new Error("projects.service.createBlock no implementado (Fase 3).");
}

export async function updateBlock(_blockId: string, _input: UpdateBlockInput) {
  throw new Error("projects.service.updateBlock no implementado (Fase 3).");
}

// ---------- Lots ----------

export async function listLotsByBlock(blockId: string) {
  return repo.findLotsByBlock(blockId);
}

export async function getLotById(id: string) {
  const lot = await repo.findLotById(id);
  if (!lot) throw new NotFoundError("Lote no encontrado");
  return lot;
}

export async function createLot(_blockId: string, _input: CreateLotInput) {
  throw new Error("projects.service.createLot no implementado (Fase 3).");
}

export async function updateLot(_id: string, _input: UpdateLotInput) {
  throw new Error("projects.service.updateLot no implementado (Fase 3).");
}

export async function searchLots(_filter: LotSearchInput) {
  throw new Error("projects.service.searchLots no implementado (Fase 3).");
}
