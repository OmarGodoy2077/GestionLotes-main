import { asyncHandler } from "../../utils/asyncHandler";
import * as service from "./cash.service";
import { UnauthorizedError } from "../../utils/apiError";

export const listSessionsController = asyncHandler(async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  res.json(await service.listSessions(page, limit));
});

export const getActiveSessionController = asyncHandler(async (_req, res) => {
  res.json(await service.getActiveSession());
});

export const getSessionController = asyncHandler(async (req, res) => {
  res.json(await service.getSessionById(req.params.id));
});

export const getSessionMovementsController = asyncHandler(async (req, res) => {
  res.json(await service.getSessionMovements(req.params.id));
});

export const openSessionController = asyncHandler(async (req, res) => {
  if (!req.user) throw new UnauthorizedError();
  const session = await service.openSession(req.body, req.user.id);
  res.status(201).json(session);
});

export const closeSessionController = asyncHandler(async (req, res) => {
  if (!req.user) throw new UnauthorizedError();
  const session = await service.closeSession(req.params.id, req.body, req.user.id);
  res.json(session);
});
