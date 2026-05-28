import type { User } from "@prisma/client";

/// DTO público (sin password).
export type PublicUser = Omit<User, "password" | "deletedAt">;
