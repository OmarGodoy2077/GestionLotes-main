import bcrypt from "bcryptjs";
import { env } from "../config/env";

/// Hashea un password en texto plano. El número de salt rounds se controla
/// por la variable `BCRYPT_SALT_ROUNDS` (>=10, default 12).
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

/// Compara un password en texto plano con un hash bcrypt almacenado.
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
