import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import * as authService from "./auth.service";
import type { LoginInput, RefreshInput } from "./auth.validators";

export const loginController = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body as LoginInput);
  res.json(result);
});

export const refreshController = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refresh(req.body as RefreshInput);
  res.json(result);
});

export const logoutController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  await authService.logout(req.user.id);
  res.status(204).send();
});
