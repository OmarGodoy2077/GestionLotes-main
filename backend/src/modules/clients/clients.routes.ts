import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  listClientsController,
  getClientController,
  createClientController,
  updateClientController,
  listGestorsController,
  addGestorController,
  searchClientsController,
} from "./clients.controller";
import {
  createClientSchema,
  updateClientSchema,
  createGestorSchema,
  clientSearchSchema,
} from "./clients.validators";

const router = Router();

router.use(authenticate);

router.get("/", listClientsController);
router.get("/search", validate(clientSearchSchema, "query"), searchClientsController);
router.post("/", validate(createClientSchema), createClientController);
router.get("/:id", getClientController);
router.patch("/:id", validate(updateClientSchema), updateClientController);

router.get("/:id/gestors", listGestorsController);
router.post("/:id/gestors", validate(createGestorSchema), addGestorController);

export default router;
