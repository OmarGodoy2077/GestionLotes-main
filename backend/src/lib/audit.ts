import type { AuditAction, AuditStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { TxClient } from "./prismaTypes";
import { sanitizeForAudit } from "./auditSanitize";

export { sanitizeForAudit } from "./auditSanitize";

/// ----------------------------------------------------------------------
/// Helper de auditoría — escribe entradas en `audit_logs` de forma uniforme.
///
/// La captura AUTOMÁTICA de CUD para entidades críticas vive en
/// `src/lib/prismaAuditExtension.ts`. Este módulo se usa para acciones
/// EXPLÍCITAS que necesitan contexto adicional:
///   - Login OK / Login fallido / Logout
///   - Cancelación de contrato (con razón)
///   - Cambio de rol / cambio de contraseña
///   - Acciones de negocio nombradas (PAYMENT_REGISTERED, etc.)
///
/// Garantías:
///   - Sanea siempre los campos sensibles (denylist) antes de persistir
///     (via `sanitizeForAudit` en `./auditSanitize`).
///   - Nunca lanza errores que rompan el flujo del caller — si la auditoría
///     falla, lo loguea por consola pero no propaga la excepción. La regla:
///     **una auditoría rota no debe tumbar una operación de negocio exitosa**.
/// ----------------------------------------------------------------------

/// Payload aceptado por `writeAuditLog`. Refleja el modelo `AuditLog` pero
/// con tipos amigables y campos opcionales con defaults seguros.
export type AuditLogInput = {
  action: AuditAction;
  entity: string;
  entityId: string;
  userId?: string | null;
  status?: AuditStatus;             // default SUCCESS
  beforeData?: unknown;
  afterData?: unknown;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  notes?: string | null;
  /// Si se pasa un cliente de transacción, la escritura participa de la tx
  /// del caller (útil para que un rollback del negocio también descarte el log).
  tx?: TxClient;
};

/// Escribe una entrada de auditoría. Sanea datos sensibles automáticamente.
/// No lanza — captura errores y los loguea.
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const client = input.tx ?? prisma;
    await client.auditLog.create({
      data: {
        action: input.action,
        status: input.status ?? "SUCCESS",
        entity: input.entity,
        entityId: input.entityId,
        userId: input.userId ?? null,
        beforeData:
          input.beforeData === undefined
            ? undefined
            : (sanitizeForAudit(input.beforeData) as Prisma.InputJsonValue),
        afterData:
          input.afterData === undefined
            ? undefined
            : (sanitizeForAudit(input.afterData) as Prisma.InputJsonValue),
        requestId: input.requestId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        notes: input.notes ?? null,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[audit] failed to write audit log:", err, {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
    });
  }
}

/// Lista entradas de auditoría con filtros y paginación. Lectura cruda — la
/// autorización (sólo ADMIN/OWNER pueden ver esto) la hace el controller.
export type AuditLogQuery = {
  userId?: string;
  entity?: string;
  entityId?: string;
  action?: AuditAction;
  status?: AuditStatus;
  requestId?: string;
  from?: Date;
  to?: Date;
  skip?: number;
  take?: number;
};

export function listAuditLogs(query: AuditLogQuery = {}) {
  const where: Prisma.AuditLogWhereInput = {
    userId: query.userId,
    entity: query.entity,
    entityId: query.entityId,
    action: query.action,
    status: query.status,
    requestId: query.requestId,
    createdAt:
      query.from || query.to
        ? {
            gte: query.from,
            lte: query.to,
          }
        : undefined,
  };
  return prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      skip: query.skip ?? 0,
      take: query.take ?? 50,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, username: true, fullName: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
}

/// Devuelve la línea de tiempo completa de UNA entidad concreta. Aprovecha el
/// índice compuesto `(entity, entityId, createdAt)`.
export function getEntityTimeline(entity: string, entityId: string) {
  return prisma.auditLog.findMany({
    where: { entity, entityId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, username: true, fullName: true } } },
  });
}
