import type { UserRole } from "@prisma/client";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthUserDto = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
};

export type LoginResponse = {
  user: AuthUserDto;
  tokens: AuthTokens;
};
