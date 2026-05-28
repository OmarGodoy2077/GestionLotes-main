import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import {
  listProjectsController,
  getProjectController,
  createProjectController,
  updateProjectController,
  listBlocksController,
  createBlockController,
  updateBlockController,
  listLotsController,
  getLotController,
  createLotController,
  updateLotController,
  searchLotsController,
} from "./projects.controller";
import {
  createProjectSchema,
  updateProjectSchema,
  createBlockSchema,
  updateBlockSchema,
  createLotSchema,
  updateLotSchema,
  lotSearchSchema,
} from "./projects.validators";

// ----- Router de Projects (montado en /api/projects) -----
export const projectsRouter = Router();

projectsRouter.use(authenticate);

projectsRouter.get("/", listProjectsController);
projectsRouter.get("/:id", getProjectController);
projectsRouter.post(
  "/",
  requireRole("ADMIN", "OWNER"),
  validate(createProjectSchema),
  createProjectController
);
projectsRouter.patch(
  "/:id",
  requireRole("ADMIN", "OWNER"),
  validate(updateProjectSchema),
  updateProjectController
);

// Blocks anidados bajo projects
projectsRouter.get("/:projectId/blocks", listBlocksController);
projectsRouter.post(
  "/:projectId/blocks",
  requireRole("ADMIN", "OWNER"),
  validate(createBlockSchema),
  createBlockController
);
projectsRouter.patch(
  "/:projectId/blocks/:blockId",
  requireRole("ADMIN", "OWNER"),
  validate(updateBlockSchema),
  updateBlockController
);

// Lots anidados bajo blocks
projectsRouter.get("/:projectId/blocks/:blockId/lots", listLotsController);
projectsRouter.post(
  "/:projectId/blocks/:blockId/lots",
  requireRole("ADMIN", "OWNER"),
  validate(createLotSchema),
  createLotController
);

// ----- Router separado para /api/lots -----
export const lotsRouter = Router();

lotsRouter.use(authenticate);

lotsRouter.get("/search", validate(lotSearchSchema, "query"), searchLotsController);
lotsRouter.get("/:id", getLotController);
lotsRouter.patch(
  "/:id",
  requireRole("ADMIN", "OWNER"),
  validate(updateLotSchema),
  updateLotController
);
