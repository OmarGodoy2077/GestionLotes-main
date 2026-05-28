# Notas de configuración del backend

> Documenta **por qué** ciertas configs están como están. Léelo antes de "limpiar" o "actualizar" cualquiera de los archivos mencionados.

---

## 1. `tsconfig.json` — `declaration` y `declarationMap` están OFF

Activarlos genera decenas de errores `TS2742: The inferred type of '<x>' cannot be named without a reference to '.pnpm/@types+...'`.

**Causa**: con pnpm, los tipos transitivos (ej: `@types/express-serve-static-core`, `@types/qs`) viven en un path no estándar (`node_modules/.pnpm/...`). Cuando TS intenta emitir un `.d.ts` que menciona esos tipos, no puede generar una referencia portable y falla.

**Por qué no nos importa**: esto es una aplicación, no una librería. Nadie consume nuestros tipos. `.d.ts` solo se necesita para libs publicables en npm.

**Si alguna vez tenemos que activarlos**:
- Opción A — Migrar a `"linker": "hoisted"` en `.npmrc` (pnpm). Pero pierde las garantías de aislamiento de pnpm.
- Opción B — Cambiar de pnpm a npm. No vale la pena.
- Opción C — Forzar las dependencias problemáticas a top-level con `"publicHoistPattern": ["@types/*"]` en `.npmrc`. Es lo más balanceado.

---

## 2. `package.json` — versiones con `~` y pin de Prisma exacto

- **`prisma` y `@prisma/client` = `5.22.0` EXACTO** (sin `^` ni `~`). Estos dos paquetes están acoplados: el CLI genera el cliente, y el cliente debe coincidir con el CLI que lo emitió. Un mismatch causa errores raros tipo "Engine version mismatch". Siempre actualizarlos juntos y deliberadamente.
- **Resto = `~`** (sólo patches). Aceptable para libs maduras como Express o Zod.

**Cuando actualices Prisma**:
1. Cambia ambas versiones a la vez en `package.json`.
2. `pnpm install` para actualizar el lockfile.
3. `pnpm exec prisma generate` para regenerar el cliente.
4. `pnpm exec prisma migrate status` (debe seguir mostrando todas las migraciones aplicadas).
5. `pnpm exec tsc --noEmit` + `pnpm build`.
6. Levantar el server y probar un endpoint que toque la DB.
7. Si todo OK, commit. Si rompe, revertir y leer el changelog de Prisma.

---

## 3. Carpeta `migrations/` vs `prisma/migrations/`

Las migraciones están en **`backend/migrations/`** (hermana de `prisma/`), NO dentro de `backend/prisma/`.

**Causa**: con `previewFeatures = ["prismaSchemaFolder"]` y `package.json > prisma.schema = "./prisma"`, Prisma asume que `./prisma` ES la carpeta del schema y crea `migrations/` al mismo nivel. El mensaje `"X migrations found in prisma/migrations"` del CLI es **engañoso** — el path real es `backend/migrations/`.

**Impacto en deploy**:
- El `Dockerfile` copia AMBAS carpetas (`prisma/` y `migrations/`).
- `prisma migrate deploy` en Railway encuentra las migraciones automáticamente.
- Si en algún momento cambian la convención (probable cuando `prismaSchemaFolder` deje de ser preview), habrá que mover físicamente la carpeta.

---

## 4. Dockerfile — `prisma generate` se ejecuta en AMBOS stages

- **Builder stage**: necesita el cliente generado para que `tsc` pueda type-checkar el código que importa `@prisma/client`.
- **Production stage**: regenera en lugar de copiar del builder.

**Por qué regenerar en producción** (en vez de COPY):
Con pnpm, `node_modules/@prisma/client` es un **symlink** apuntando a `node_modules/.pnpm/@prisma+client@<v>/node_modules/@prisma/client`. Si copias el symlink "tal cual" desde otro stage, el target del symlink (`.pnpm/...`) NO viaja, y el binding nativo (`query_engine-linux-musl.node`) falla en runtime.

`prisma generate` toma <2s y deja todo en el sitio correcto.

---

## 5. Cliente Prisma extendido (`prisma.$extends`)

`src/lib/prisma.ts` exporta un cliente EXTENDIDO con la audit-extension aplicada. Implicaciones:

- **`Prisma.TransactionClient` ya no funciona** como tipo para callbacks de `$transaction`. Usar `TxClient` de `src/lib/prismaTypes.ts`.
- **El seed (`prisma/seeds/seed.ts`) usa el cliente BASE** (no extendido) intencionalmente — no queremos que el bootstrap genere logs de auditoría.
- La extension NO audita `AuditLog` (protección anti-recursión vía `FORBIDDEN_AUDIT_MODELS`). NUNCA quitar ese guard.

---

## 6. Lockfile (`pnpm-lock.yaml`) es la fuente de verdad

- **NUNCA editarlo manualmente.**
- **NUNCA hacer `pnpm install --no-frozen-lockfile`** salvo que estés deliberadamente actualizando versiones.
- En CI/Docker siempre `pnpm install --frozen-lockfile`.
- Si pnpm avisa "lockfile out of date", regenerarlo localmente (`pnpm install`) y commitear el lockfile actualizado.
