import { z } from "zod";
import { ContractStatus } from "@prisma/client";

const lotLineSchema = z.object({
  lotId: z.string().uuid(),
  priceAtContract: z.coerce.number().positive(),
  discount: z.coerce.number().nonnegative().default(0),
  notes: z.string().max(500).optional(),
});

const downPaymentInstallmentSchema = z.object({
  installmentNumber: z.coerce.number().int().positive(),
  dueDate: z.coerce.date(),
  amount: z.coerce.number().positive(),
});

export const createContractSchema = z
  .object({
    clientId: z.string().uuid(),
    gestorId: z.string().uuid().optional(),
    contractDate: z.coerce.date().optional(),

    lots: z.array(lotLineSchema).min(1, "Debe incluir al menos un lote"),

    downPaymentAmount: z.coerce.number().nonnegative().default(0),
    isDownPaymentInstallment: z.boolean().default(false),
    downPaymentInstallments: z
      .array(downPaymentInstallmentSchema)
      .optional(),

    termYears: z.coerce.number().int().positive().optional(),
    numberOfPayments: z.coerce.number().int().positive().optional(),
    annualRate: z.coerce.number().nonnegative().optional(),
    firstPaymentDate: z.coerce.date().optional(),

    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.isDownPaymentInstallment &&
      (!data.downPaymentInstallments ||
        data.downPaymentInstallments.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["downPaymentInstallments"],
        message: "Debe definir las cuotas del enganche cuando es fraccionado",
      });
    }
  });
export type CreateContractInput = z.infer<typeof createContractSchema>;

export const updateContractSchema = z.object({
  status: z.nativeEnum(ContractStatus).optional(),
  notes: z.string().max(1000).optional(),
});
export type UpdateContractInput = z.infer<typeof updateContractSchema>;

export const cancelContractSchema = z.object({
  reason: z.string().min(1).max(1000),
});
export type CancelContractInput = z.infer<typeof cancelContractSchema>;

export const addLotsSchema = z.object({
  lots: z.array(lotLineSchema).min(1),
});
export type AddLotsInput = z.infer<typeof addLotsSchema>;

export const removeLotsSchema = z.object({
  lotIds: z.array(z.string().uuid()).min(1),
  /// Si true, cuando queden 0 lotes el contrato se cancela; si false, error.
  cancelIfEmpty: z.boolean().default(true),
});
export type RemoveLotsInput = z.infer<typeof removeLotsSchema>;

export const contractSearchSchema = z.object({
  number: z.string().optional(),
  client: z.string().optional(),
  status: z.nativeEnum(ContractStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ContractSearchInput = z.infer<typeof contractSearchSchema>;
