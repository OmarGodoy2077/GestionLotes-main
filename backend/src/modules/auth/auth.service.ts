import type { LoginInput, RefreshInput } from "./auth.validators";
import type { LoginResponse, AuthTokens } from "./auth.types";

/// Servicio de autenticación.
/// La implementación completa se hará en Fase 3. Estas firmas se mantienen
/// estables para que el controller, las rutas y los tests existan desde ya.

export async function login(_input: LoginInput): Promise<LoginResponse> {
  throw new Error("auth.service.login no implementado (Fase 3).");
}

export async function refresh(_input: RefreshInput): Promise<AuthTokens> {
  throw new Error("auth.service.refresh no implementado (Fase 3).");
}

export async function logout(_userId: string): Promise<void> {
  throw new Error("auth.service.logout no implementado (Fase 3).");
}
