import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

/// Logger sencillo de requests HTTP. En producción se puede reemplazar por
/// pino/winston; por ahora basta para inspección local.
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (env.NODE_ENV === "test") return next();

  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    // eslint-disable-next-line no-console
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`
    );
  });
  next();
}
