import { z } from "zod";

export const openCashSessionSchema = z.object({
  openingAmount: z.coerce.number().nonnegative().default(0),
  notes: z.string().max(1000).optional(),
});
export type OpenCashSessionInput = z.infer<typeof openCashSessionSchema>;

export const closeCashSessionSchema = z.object({
  countedAmount: z.coerce.number().nonnegative(),
  notes: z.string().max(1000).optional(),
});
export type CloseCashSessionInput = z.infer<typeof closeCashSessionSchema>;
