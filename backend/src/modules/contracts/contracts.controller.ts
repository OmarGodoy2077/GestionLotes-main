import { asyncHandler } from "../../utils/asyncHandler";
import * as service from "./contracts.service";

export const listContractsController = asyncHandler(async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  res.json(await service.listContracts(page, limit));
});

export const getContractController = asyncHandler(async (req, res) => {
  res.json(await service.getContractById(req.params.id));
});

export const createContractController = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createContract(req.body));
});

export const updateContractController = asyncHandler(async (req, res) => {
  res.json(await service.updateContract(req.params.id, req.body));
});

export const cancelContractController = asyncHandler(async (req, res) => {
  res.json(await service.cancelContract(req.params.id, req.body));
});

export const addLotsController = asyncHandler(async (req, res) => {
  res.json(await service.addLots(req.params.id, req.body));
});

export const removeLotsController = asyncHandler(async (req, res) => {
  res.json(await service.removeLots(req.params.id, req.body));
});

export const paymentScheduleController = asyncHandler(async (req, res) => {
  res.json(await service.getPaymentSchedule(req.params.id));
});

export const searchContractsController = asyncHandler(async (req, res) => {
  res.json(await service.searchContracts(req.query as never));
});
