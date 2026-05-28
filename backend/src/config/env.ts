import { z } from "zod";

/// Schema de variables de entorno. Si alguna requerida falta o tiene formato
/// inválido, el proceso debe terminar inmediatamente (fail-fast).
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL es requerida"),

  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET debe tener al menos 16 caracteres"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, "JWT_REFRESH_SECRET debe tener al menos 16 caracteres"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  FRONTEND_URL: z
    .string()
    .url()
    .default("http://localhost:5173"),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).default(12),

  /// Cantidad máxima de intentos de login por IP por minuto.
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    "❌ Variables de entorno inválidas:\n",
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)
  );
  process.exit(1);
}

export const env = parsed.data;

export type Env = typeof env;
