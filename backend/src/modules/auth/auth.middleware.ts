/// Re-export del middleware de autenticación para mantener cercanía al módulo.
/// La implementación vive en `src/middleware/auth.ts` para que pueda usarse
/// transversalmente desde todos los módulos sin acoplamiento.
export { authenticate, optionalAuthenticate } from "../../middleware/auth";
