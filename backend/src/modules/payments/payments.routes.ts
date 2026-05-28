import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import {
  listPaymentsByContractController,
  createPaymentController,
  getPaymentController,
  generateReceiptController,
  searchPaymentsController,
} from "./payments.controller";
import {
  createPaymentSchema,
  paymentSearchSchema,
} from "./payments.validators";

// ----- Router montado bajo /api/contracts/:contractId/payments -----
export const contractPaymentsRouter = Router({ mergeParams: true });
contractPaymentsRouter.use(authenticate);

contractPaymentsRouter.get("/", listPaymentsByContractController);
contractPaymentsRouter.post(
  "/",
  requireRole("ADMIN", "OWNER", "COLLECTOR"),
  validate(createPaymentSchema),
  createPaymentController
);

// ----- Router montado bajo /api/payments -----
export const paymentsRouter = Router();
paymentsRouter.use(authenticate);

paymentsRouter.get("/search", validate(paymentSearchSchema, "query"), searchPaymentsController);
paymentsRouter.get("/:id", getPaymentController);
paymentsRouter.post("/:id/receipt", generateReceiptController);
