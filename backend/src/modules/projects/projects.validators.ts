import { z } from "zod";
import { LotStatus, LotType } from "@prisma/client";

// ---------- Project ----------

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  address: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// ---------- Block ----------

export const createBlockSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});
export type CreateBlockInput = z.infer<typeof createBlockSchema>;

export const updateBlockSchema = createBlockSchema.partial();
export type UpdateBlockInput = z.infer<typeof updateBlockSchema>;

// ---------- Lot ----------

export const createLotSchema = z.object({
  lotNumber: z.string().min(1).max(50),
  area: z.coerce.number().positive(),
  basePrice: z.coerce.number().nonnegative(),
  street: z.string().max(200).optional(),
  isCorner: z.boolean().optional(),
  status: z.nativeEnum(LotStatus).optional(),
  type: z.nativeEnum(LotType).optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateLotInput = z.infer<typeof createLotSchema>;

export const updateLotSchema = createLotSchema.partial();
export type UpdateLotInput = z.infer<typeof updateLotSchema>;

export const lotSearchSchema = z.object({
  project: z.string().optional(),
  block: z.string().optional(),
  number: z.string().optional(),
  status: z.nativeEnum(LotStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type LotSearchInput = z.infer<typeof lotSearchSchema>;
