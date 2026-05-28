import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { UnauthorizedError } from "../utils/apiError";
import type { UserRole } from "@prisma/client";

/// Datos del usuario autenticado adjuntados al request por este middleware.
export type AuthenticatedUser = {
  id: string;
  username: string;
  role: UserRole;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/// Extrae y verifica el JWT del header Authorization (Bearer).
/// Adjunta `req.user` con `{ id, username, role }`.
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new UnauthorizedError("Falta el token de autenticación");
  }

  const token = header.slice("Bearer ".length).trim();
  const payload = verifyAccessToken(token);

  req.user = {
    id: payload.sub,
    username: payload.username,
    role: payload.role as UserRole,
  };
  next();
}

/// Variante opcional: si hay token lo valida, si no lo hay no falla.
/// Útil para endpoints públicos que enriquecen la respuesta si hay usuario.
export function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next();
  }
  try {
    const payload = verifyAccessToken(header.slice("Bearer ".length).trim());
    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role as UserRole,
    };
  } catch {
    // Token inválido en endpoint opcional → seguir sin user.
  }
  next();
}
