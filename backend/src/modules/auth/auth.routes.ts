import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../../middleware/validate";
import { authenticate } from "../../middleware/auth";
import { env } from "../../config/env";
import {
  loginController,
  refreshController,
  logoutController,
} from "./auth.controller";
import { loginSchema, refreshSchema } from "./auth.validators";

const router = Router();

/// Rate limit en login para mitigar fuerza bruta.
/// Default: 10 intentos por minuto por IP (configurable vía LOGIN_RATE_LIMIT).
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.LOGIN_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Intenta de nuevo en un minuto." },
});

router.post("/login", loginLimiter, validate(loginSchema), loginController);
router.post("/refresh", validate(refreshSchema), refreshController);
router.post("/logout", authenticate, logoutController);

export default router;
