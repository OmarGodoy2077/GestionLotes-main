import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/apiError";
import { env } from "../config/env";

/// Manejador centralizado de errores.
/// Distingue entre:
///   - `ApiError` (errores operacionales esperados)
///   - `ZodError` (errores de validación)
///   - `Prisma.PrismaClientKnownRequestError` (violaciones de constraint, etc.)
///   - Cualquier otro Error → 500 Internal Server Error
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // --- ApiError ---
  if (err instanceof ApiError) {
    if (env.NODE_ENV !== "production" && !err.isOperational) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // --- Zod ---
  if (err instanceof ZodError) {
    res.status(422).json({
      error: "Validation Error",
      details: err.flatten(),
    });
    return;
  }

  // --- Prisma known errors ---
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint failed
    if (err.code === "P2002") {
      res.status(409).json({
        error: "Conflicto: el recurso ya existe",
        details: { target: err.meta?.target },
      });
      return;
    }
    // P2025: Record not found
    if (err.code === "P2025") {
      res.status(404).json({ error: "Recurso no encontrado" });
      return;
    }
    res.status(400).json({
      error: "Error de base de datos",
      details: { code: err.code, meta: err.meta },
    });
    return;
  }

  // --- Default ---
  // eslint-disable-next-line no-console
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    ...(env.NODE_ENV !== "production" && err instanceof Error
      ? { stack: err.stack }
      : {}),
  });
}
