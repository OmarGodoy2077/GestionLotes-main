import { Router } from "express";
import healthRouter from "./health";
import authRouter from "../modules/auth/auth.routes";
import { projectsRouter, lotsRouter } from "../modules/projects/projects.routes";
import clientsRouter from "../modules/clients/clients.routes";
import contractsRouter from "../modules/contracts/contracts.routes";
import {
  paymentsRouter,
  contractPaymentsRouter,
} from "../modules/payments/payments.routes";
import cashRouter from "../modules/cash/cash.routes";
import usersRouter from "../modules/users/users.routes";

/// Router principal que agrega todos los módulos bajo /api/* (y /health al raíz).
const api = Router();

api.use("/auth", authRouter);
api.use("/projects", projectsRouter);
api.use("/lots", lotsRouter);
api.use("/clients", clientsRouter);
api.use("/contracts", contractsRouter);

// Pagos anidados bajo un contrato y router plano por id de pago
api.use("/contracts/:contractId/payments", contractPaymentsRouter);
api.use("/payments", paymentsRouter);

api.use("/cash", cashRouter);
api.use("/users", usersRouter);

const root = Router();
root.use("/health", healthRouter);
root.use("/api", api);

export default root;
