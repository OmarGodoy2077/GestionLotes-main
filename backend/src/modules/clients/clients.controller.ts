import { asyncHandler } from "../../utils/asyncHandler";
import * as service from "./clients.service";

export const listClientsController = asyncHandler(async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  res.json(await service.listClients(page, limit));
});

export const getClientController = asyncHandler(async (req, res) => {
  res.json(await service.getClientById(req.params.id));
});

export const createClientController = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createClient(req.body));
});

export const updateClientController = asyncHandler(async (req, res) => {
  res.json(await service.updateClient(req.params.id, req.body));
});

export const listGestorsController = asyncHandler(async (req, res) => {
  res.json(await service.listGestors(req.params.id));
});

export const addGestorController = asyncHandler(async (req, res) => {
  res.status(201).json(await service.addGestor(req.params.id, req.body));
});

export const searchClientsController = asyncHandler(async (req, res) => {
  res.json(await service.searchClients(req.query as never));
});
