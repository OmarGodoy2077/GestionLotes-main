import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import {
  listUsersController,
  getUserController,
  createUserController,
  updateUserController,
  toggleActiveController,
} from "./users.controller";
import {
  createUserSchema,
  updateUserSchema,
} from "./users.validators";

const router = Router();

router.use(authenticate, requireRole("ADMIN", "OWNER"));

router.get("/", listUsersController);
router.post("/", validate(createUserSchema), createUserController);
router.get("/:id", getUserController);
router.patch("/:id", validate(updateUserSchema), updateUserController);
router.patch("/:id/toggle-active", toggleActiveController);

export default router;
