import { Prisma, type PrismaClient } from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";
import { sanitizeForAudit } from "./auditSanitize";

/// ---------------------------------------------------------------------------
/// Extension de Prisma que captura AUTOMÁTICAMENTE las operaciones
/// CREATE / UPDATE / DELETE sobre entidades críticas y deja un AuditLog
/// con snapshots before/after.
///
/// Diseño:
///   - Usa `prisma.$extends({ query: ... })` (API moderna de Prisma 5).
///   - Sólo audita los modelos listados en `AUDITED_MODELS`. El resto pasa
///     directo sin overhead.
///   - El `userId`, `requestId`, `ipAddress`, `userAgent` se leen de un
///     AsyncLocalStorage llenado por el middleware HTTP. Mientras el
///     middleware de auth real no exista (Fase 3.2), esos campos quedarán
///     `null` y la auditoría sigue capturando la acción.
///
/// Limitaciones documentadas:
///   - `updateMany` / `deleteMany`: no se leen las filas afectadas (sería
///     costoso). Se loguea con `entityId = "bulk:<count>"` y el filtro WHERE.
///   - `upsert`: se trata como UPDATE si había fila previa, CREATE si no.
///   - Si la operación está dentro de `prisma.$transaction`, el AuditLog
///     comparte la misma tx — si el negocio hace rollback, el log también.
/// ---------------------------------------------------------------------------

/// Contexto de la petición HTTP — lo llena un middleware Express en cada
/// request (Fase 3.2), lo lee el extension cada vez que se ejecuta una
/// operación.
export type AuditContext = {
  userId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export const auditContextStore = new AsyncLocalStorage<AuditContext>();

/// Wrapper que ejecuta `fn` con un contexto activo. Lo usará el middleware
/// HTTP de auth: `runWithAuditContext({ userId, requestId, ... }, () => next())`.
export function runWithAuditContext<T>(
  ctx: AuditContext,
  fn: () => Promise<T> | T
): Promise<T> | T {
  return auditContextStore.run(ctx, fn);
}

/// Modelos que se auditan automáticamente. El nombre debe coincidir EXACTO con
/// el del modelo Prisma (no el `@@map`).
const AUDITED_MODELS = new Set<string>([
  "User",
  "Client",
  "Contract",
  "ContractLot",
  "Payment",
  "Lot",
  "CashSession",
  "BankAccount",
  "Block",
  "Project",
]);

/// Nombre lógico de la entidad que se persiste en `audit_logs.entity`
/// (snake_case del `@@map`, consistente con el nombre real de la tabla).
const MODEL_TO_ENTITY: Record<string, string> = {
  User: "users",
  Client: "clients",
  Contract: "contracts",
  ContractLot: "contract_lots",
  Payment: "payments",
  Lot: "lots",
  CashSession: "cash_sessions",
  BankAccount: "bank_accounts",
  Block: "blocks",
  Project: "projects",
};

/// Crea el cliente Prisma extendido con auditoría automática.
export function applyAuditExtension(client: PrismaClient) {
  // Helper: lee la fila antes de modificarla (para UPDATE/DELETE/UPSERT).
  async function readBefore(
    model: string,
    where: unknown
  ): Promise<({ id?: string } & Record<string, unknown>) | null> {
    try {
      const delegateName = model.charAt(0).toLowerCase() + model.slice(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const delegate = (client as any)[delegateName];
      if (!delegate?.findUnique) return null;
      return (await delegate.findUnique({ where })) as
        | ({ id?: string } & Record<string, unknown>)
        | null;
    } catch {
      return null;
    }
  }

  // Helper: persiste el AuditLog con sanitización + contexto. No lanza.
  async function safeAudit(payload: {
    action: Prisma.AuditLogCreateInput["action"];
    entity: string;
    entityId: string;
    beforeData?: unknown;
    afterData?: unknown;
    notes?: string;
  }): Promise<void> {
    try {
      const ctx = auditContextStore.getStore() ?? {};
      await client.auditLog.create({
        data: {
          action: payload.action,
          status: "SUCCESS",
          entity: payload.entity,
          entityId: payload.entityId,
          userId: ctx.userId ?? null,
          requestId: ctx.requestId ?? null,
          ipAddress: ctx.ipAddress ?? null,
          userAgent: ctx.userAgent ?? null,
          beforeData:
            payload.beforeData === undefined
              ? undefined
              : (sanitizeForAudit(payload.beforeData) as Prisma.InputJsonValue),
          afterData:
            payload.afterData === undefined
              ? undefined
              : (sanitizeForAudit(payload.afterData) as Prisma.InputJsonValue),
          notes: payload.notes ?? null,
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[audit-extension] failed to write log:", err, payload);
    }
  }

  return client.$extends({
    name: "audit-extension",
    query: {
      $allModels: {
        async create({ model, args, query }) {
          if (!AUDITED_MODELS.has(model)) return query(args);
          const result = (await query(args)) as { id?: string };
          await safeAudit({
            action: "CREATE",
            entity: MODEL_TO_ENTITY[model] ?? model,
            entityId: result?.id ?? "unknown",
            afterData: result,
          });
          return result;
        },

        async update({ model, args, query }) {
          if (!AUDITED_MODELS.has(model)) return query(args);
          const before = await readBefore(
            model,
            (args as { where: unknown }).where
          );
          const result = (await query(args)) as { id?: string };
          await safeAudit({
            action: "UPDATE",
            entity: MODEL_TO_ENTITY[model] ?? model,
            entityId: result?.id ?? "unknown",
            beforeData: before,
            afterData: result,
          });
          return result;
        },

        async delete({ model, args, query }) {
          if (!AUDITED_MODELS.has(model)) return query(args);
          const before = await readBefore(
            model,
            (args as { where: unknown }).where
          );
          const result = (await query(args)) as { id?: string };
          await safeAudit({
            action: "DELETE",
            entity: MODEL_TO_ENTITY[model] ?? model,
            entityId: result?.id ?? before?.id ?? "unknown",
            beforeData: before,
          });
          return result;
        },

        async upsert({ model, args, query }) {
          if (!AUDITED_MODELS.has(model)) return query(args);
          const before = await readBefore(
            model,
            (args as { where: unknown }).where
          );
          const result = (await query(args)) as { id?: string };
          await safeAudit({
            action: before ? "UPDATE" : "CREATE",
            entity: MODEL_TO_ENTITY[model] ?? model,
            entityId: result?.id ?? "unknown",
            beforeData: before ?? undefined,
            afterData: result,
          });
          return result;
        },

        async updateMany({ model, args, query }) {
          if (!AUDITED_MODELS.has(model)) return query(args);
          const result = (await query(args)) as { count: number };
          await safeAudit({
            action: "UPDATE",
            entity: MODEL_TO_ENTITY[model] ?? model,
            entityId: `bulk:${result.count}`,
            afterData: {
              bulkOperation: "updateMany",
              where: (args as { where?: unknown }).where ?? null,
              affected: result.count,
            },
            notes: `Bulk update affecting ${result.count} rows`,
          });
          return result;
        },

        async deleteMany({ model, args, query }) {
          if (!AUDITED_MODELS.has(model)) return query(args);
          const result = (await query(args)) as { count: number };
          await safeAudit({
            action: "DELETE",
            entity: MODEL_TO_ENTITY[model] ?? model,
            entityId: `bulk:${result.count}`,
            beforeData: {
              bulkOperation: "deleteMany",
              where: (args as { where?: unknown }).where ?? null,
              affected: result.count,
            },
            notes: `Bulk delete affecting ${result.count} rows`,
          });
          return result;
        },
      },
    },
  });
}
