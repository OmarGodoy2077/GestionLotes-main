import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { UserRole } from "@prisma/client";
import { ForbiddenError, UnauthorizedError } from "../utils/apiError";

/// Middleware que restringe el acceso a una lista de roles. Debe usarse
/// SIEMPRE después de `authenticate`.
///
/// Ejemplo: `router.post("/projects", authenticate, requireRole("ADMIN", "OWNER"), handler)`
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError("Se requiere autenticación");
    }
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Rol no autorizado. Requiere: ${roles.join(", ")}`
      );
    }
    next();
  };
}
