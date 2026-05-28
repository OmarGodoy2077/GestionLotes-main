import { z } from "zod";
import { UserRole } from "@prisma/client";

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  fullName: z.string().min(1).max(200),
  role: z.nativeEnum(UserRole).default("VIEWER"),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(1).max(200).optional(),
  role: z.nativeEnum(UserRole).optional(),
  password: z.string().min(8).max(100).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
