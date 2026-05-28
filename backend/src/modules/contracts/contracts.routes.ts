import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import {
  listContractsController,
  getContractController,
  createContractController,
  updateContractController,
  cancelContractController,
  addLotsController,
  removeLotsController,
  paymentScheduleController,
  searchContractsController,
} from "./contracts.controller";
import {
  createContractSchema,
  updateContractSchema,
  cancelContractSchema,
  addLotsSchema,
  removeLotsSchema,
  contractSearchSchema,
} from "./contracts.validators";

const router = Router();

router.use(authenticate);

router.get("/", listContractsController);
router.get("/search", validate(contractSearchSchema, "query"), searchContractsController);
router.post(
  "/",
  requireRole("ADMIN", "OWNER"),
  validate(createContractSchema),
  createContractController
);
router.get("/:id", getContractController);
router.patch(
  "/:id",
  requireRole("ADMIN", "OWNER"),
  validate(updateContractSchema),
  updateContractController
);
router.post(
  "/:id/cancel",
  requireRole("ADMIN", "OWNER"),
  validate(cancelContractSchema),
  cancelContractController
);
router.post(
  "/:id/lots/add",
  requireRole("ADMIN", "OWNER"),
  validate(addLotsSchema),
  addLotsController
);
router.post(
  "/:id/lots/remove",
  requireRole("ADMIN", "OWNER"),
  validate(removeLotsSchema),
  removeLotsController
);
router.get("/:id/payment-schedule", paymentScheduleController);

export default router;
