import type { CorsOptions } from "cors";
import { env } from "./env";

/// Configuración de CORS. Permite el origen del frontend definido en env
/// y los orígenes locales típicos de desarrollo.
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowed = new Set<string>([
      env.FRONTEND_URL,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ]);

    // Permitir requests sin Origin (curl, Postman, server-to-server).
    if (!origin) return callback(null, true);

    if (allowed.has(origin)) return callback(null, true);
    return callback(new Error(`Origin no permitido por CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
