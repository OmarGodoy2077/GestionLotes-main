import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import * as service from "./projects.service";

// ---------- Projects ----------

export const listProjectsController = asyncHandler(async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const result = await service.listProjects(page, limit);
  res.json(result);
});

export const getProjectController = asyncHandler(async (req: Request, res: Response) => {
  const project = await service.getProjectById(req.params.id);
  res.json(project);
});

export const createProjectController = asyncHandler(async (req, res) => {
  const project = await service.createProject(req.body);
  res.status(201).json(project);
});

export const updateProjectController = asyncHandler(async (req, res) => {
  const project = await service.updateProject(req.params.id, req.body);
  res.json(project);
});

// ---------- Blocks ----------

export const listBlocksController = asyncHandler(async (req, res) => {
  const blocks = await service.listBlocksByProject(req.params.projectId);
  res.json(blocks);
});

export const createBlockController = asyncHandler(async (req, res) => {
  const block = await service.createBlock(req.params.projectId, req.body);
  res.status(201).json(block);
});

export const updateBlockController = asyncHandler(async (req, res) => {
  const block = await service.updateBlock(req.params.blockId, req.body);
  res.json(block);
});

// ---------- Lots ----------

export const listLotsController = asyncHandler(async (req, res) => {
  const lots = await service.listLotsByBlock(req.params.blockId);
  res.json(lots);
});

export const getLotController = asyncHandler(async (req, res) => {
  const lot = await service.getLotById(req.params.id);
  res.json(lot);
});

export const createLotController = asyncHandler(async (req, res) => {
  const lot = await service.createLot(req.params.blockId, req.body);
  res.status(201).json(lot);
});

export const updateLotController = asyncHandler(async (req, res) => {
  const lot = await service.updateLot(req.params.id, req.body);
  res.json(lot);
});

export const searchLotsController = asyncHandler(async (req, res) => {
  const result = await service.searchLots(req.query as never);
  res.json(result);
});
