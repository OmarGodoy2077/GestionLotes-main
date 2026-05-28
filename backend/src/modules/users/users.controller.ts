import { asyncHandler } from "../../utils/asyncHandler";
import * as service from "./users.service";

export const listUsersController = asyncHandler(async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  res.json(await service.listUsers(page, limit));
});

export const getUserController = asyncHandler(async (req, res) => {
  res.json(await service.getUserById(req.params.id));
});

export const createUserController = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createUser(req.body));
});

export const updateUserController = asyncHandler(async (req, res) => {
  res.json(await service.updateUser(req.params.id, req.body));
});

export const toggleActiveController = asyncHandler(async (req, res) => {
  res.json(await service.toggleActive(req.params.id));
});
