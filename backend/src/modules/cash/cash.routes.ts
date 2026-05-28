import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import {
  listSessionsController,
  getSessionController,
  getActiveSessionController,
  getSessionMovementsController,
  openSessionController,
  closeSessionController,
} from "./cash.controller";
import {
  openCashSessionSchema,
  closeCashSessionSchema,
} from "./cash.validators";

const router = Router();

router.use(authenticate);

router.get("/sessions", listSessionsController);
router.get("/sessions/active", getActiveSessionController);
router.post(
  "/sessions",
  requireRole("ADMIN", "OWNER", "COLLECTOR"),
  validate(openCashSessionSchema),
  openSessionController
);
router.get("/sessions/:id", getSessionController);
router.get("/sessions/:id/movements", getSessionMovementsController);
router.post(
  "/sessions/:id/close",
  requireRole("ADMIN", "OWNER", "COLLECTOR"),
  validate(closeCashSessionSchema),
  closeSessionController
);

export default router;
