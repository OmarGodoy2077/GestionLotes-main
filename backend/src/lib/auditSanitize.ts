/// Saneamiento de datos sensibles antes de persistirlos en `audit_logs`.
/// Aislado en su propio módulo para evitar ciclos entre `audit.ts`,
/// `prismaAuditExtension.ts` y `prisma.ts`.

/// Campos que JAMÁS deben llegar al log. Aplica recursivamente sobre objetos
/// anidados. Reemplaza el valor por la constante `REDACTED`.
const SENSITIVE_FIELDS = new Set<string>([
  "password",
  "passwordHash",
  "hash",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "apiKey",
  "api_key",
  "authorization",
  "cookie",
  "creditCard",
  "cvv",
  "pin",
]);

export const REDACTED = "[REDACTED]";

/// Limpia recursivamente un objeto eliminando campos sensibles.
/// - Si recibe `null`/`undefined`, los respeta.
/// - Si recibe un primitivo, lo devuelve tal cual.
/// - Si recibe un array, sanea cada elemento.
/// - Si recibe un Date, lo devuelve tal cual.
export function sanitizeForAudit<T>(input: T): T {
  if (input === null || input === undefined) return input;
  if (typeof input !== "object") return input;
  if (input instanceof Date) return input;
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeForAudit(item)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.has(key)) {
      out[key] = REDACTED;
    } else {
      out[key] = sanitizeForAudit(value);
    }
  }
  return out as unknown as T;
}
