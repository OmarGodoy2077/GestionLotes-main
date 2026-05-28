import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

export const createPaymentSchema = z
  .object({
    paymentDate: z.coerce.date().optional(),
    amountDue: z.coerce.number().nonnegative(),
    amountPaid: z.coerce.number().positive(),
    method: z.nativeEnum(PaymentMethod),

    /// IDs de cuotas (PaymentSchedule) a las que se quiere aplicar este pago.
    /// Si se omite, el service aplica según orden cronológico de vencimiento.
    appliesToScheduleIds: z.array(z.string().uuid()).optional(),

    /// Si true, el monto excedente se aplica directamente a capital
    /// (recalculando el calendario hacia adelante).
    isAdvancePayment: z.boolean().default(false),

    // --- Datos según método ---
    bankAccountId: z.string().uuid().optional(),
    voucherNumber: z.string().max(100).optional(),
    checkNumber: z.string().max(100).optional(),
    checkBank: z.string().max(200).optional(),

    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.method === "TRANSFER" || data.method === "DEPOSIT") &&
      !data.bankAccountId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bankAccountId"],
        message: "bankAccountId es requerido para TRANSFER/DEPOSIT",
      });
    }
    if (data.method === "CHECK" && (!data.checkNumber || !data.checkBank)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["checkNumber"],
        message: "checkNumber y checkBank son requeridos para CHECK",
      });
    }
  });
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const paymentSearchSchema = z.object({
  contract: z.string().optional(),
  client: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type PaymentSearchInput = z.infer<typeof paymentSearchSchema>;
