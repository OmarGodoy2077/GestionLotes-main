import jwt, { type SignOptions, type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";
import { UnauthorizedError } from "../utils/apiError";

export type AccessTokenPayload = {
  sub: string;       // user id
  username: string;
  role: string;
};

export type RefreshTokenPayload = {
  sub: string;
  tokenVersion?: number;
};

/// Firma un access token de corta duración.
export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

/// Firma un refresh token de larga duración.
export function signRefreshToken(payload: RefreshTokenPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

/// Verifica un access token. Lanza `UnauthorizedError` si es inválido/expirado.
export function verifyAccessToken(token: string): AccessTokenPayload & JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload & JwtPayload;
  } catch {
    throw new UnauthorizedError("Token inválido o expirado");
  }
}

/// Verifica un refresh token. Lanza `UnauthorizedError` si es inválido/expirado.
export function verifyRefreshToken(token: string): RefreshTokenPayload & JwtPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload & JwtPayload;
  } catch {
    throw new UnauthorizedError("Refresh token inválido o expirado");
  }
}
