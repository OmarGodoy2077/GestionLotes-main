import { z } from "zod";
import { MaritalStatus, HousingType, OccupationType } from "@prisma/client";

// ---------- Occupation ----------

export const occupationSchema = z
  .object({
    type: z.nativeEnum(OccupationType),
    companyName: z.string().max(200).optional(),
    companyAddress: z.string().max(500).optional(),
    companyPhone: z.string().max(50).optional(),
    position: z.string().max(200).optional(),
    tenureYears: z.coerce.number().int().nonnegative().optional(),
    tenureMonths: z.coerce.number().int().min(0).max(11).optional(),
    businessName: z.string().max(200).optional(),
    businessAddress: z.string().max(500).optional(),
    businessPhone: z.string().max(50).optional(),
    businessType: z.string().max(200).optional(),
    monthlyIncome: z.coerce.number().nonnegative().optional(),
    otherIncome: z.coerce.number().nonnegative().optional(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "EMPLOYED" && !data.companyName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["companyName"],
        message: "companyName es requerido cuando type=EMPLOYED",
      });
    }
    if (data.type === "SELF_EMPLOYED" && !data.businessName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["businessName"],
        message: "businessName es requerido cuando type=SELF_EMPLOYED",
      });
    }
  });
export type OccupationInput = z.infer<typeof occupationSchema>;

// ---------- Client ----------

export const createClientSchema = z.object({
  fullName: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  dpi: z.string().max(50).optional(),
  dpiType: z.string().max(50).optional(),
  nit: z.string().max(50).optional(),
  email: z.string().email().optional(),
  birthDate: z.coerce.date().optional(),
  nationality: z.string().max(100).optional(),
  maritalStatus: z.nativeEnum(MaritalStatus).optional(),
  housingType: z.nativeEnum(HousingType).optional(),
  profession: z.string().max(200).optional(),
  isForeign: z.boolean().optional(),
  livesAbroad: z.boolean().optional(),
  occupation: occupationSchema.optional(),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.partial();
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

// ---------- Gestor ----------

/// Para crear un gestor se puede:
///   - Pasar `linkedClientId` (vincular a un cliente existente)
///   - O pasar los datos inline (fullName, dpi, etc.)
export const createGestorSchema = z
  .object({
    linkedClientId: z.string().uuid().optional(),
    fullName: z.string().max(200).optional(),
    dpi: z.string().max(50).optional(),
    dpiType: z.string().max(50).optional(),
    phone: z.string().max(50).optional(),
    address: z.string().max(500).optional(),
    birthDate: z.coerce.date().optional(),
    nationality: z.string().max(100).optional(),
    housingType: z.nativeEnum(HousingType).optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine((d) => d.linkedClientId || d.fullName, {
    message: "Debe proveer linkedClientId o los datos inline del gestor",
    path: ["fullName"],
  });
export type CreateGestorInput = z.infer<typeof createGestorSchema>;

// ---------- Search ----------

export const clientSearchSchema = z.object({
  dpi: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ClientSearchInput = z.infer<typeof clientSearchSchema>;
