import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodSchema } from "zod";

/// Indica qué parte del request validar (body por defecto).
export type ValidateTarget = "body" | "query" | "params";

/// Middleware genérico que valida una parte del request con un schema Zod.
/// Si la validación es exitosa, reemplaza la sección por los datos parseados
/// (con coerciones y defaults aplicados).
export function validate(
  schema: ZodSchema,
  target: ValidateTarget = "body"
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return next(result.error);
    }
    // Castear porque Express tipa los targets como genéricos.
    (req as unknown as Record<ValidateTarget, unknown>)[target] = result.data;
    next();
  };
}
