import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "username requerido"),
  password: z.string().min(1, "password requerido"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken requerido"),
});
export type RefreshInput = z.infer<typeof refreshSchema>;
