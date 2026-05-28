# Estado del Proyecto — GestionLotes (Fase 3 — DB aplicada + Auditoría automática)

> Actualizado al cierre de Fase 3.1 + auditoría automática (3.1.1).
> Reemplaza al `STATE.md` raíz de Fase 1.

---

## Resumen de Fase 3.1

| Paso | Estado | Comando | Resultado |
|---|---|---|---|
| Instalación deps | ✅ | `pnpm install` | `node_modules` generado (vía pnpm 9.1.0 instalado con `npm i -g pnpm@9.1.0`; corepack no funcionó por permisos en `C:\Program Files\nodejs`) |
| Cliente Prisma | ✅ | `pnpm exec prisma generate` | Cliente generado leyendo carpeta `./prisma` (config en `package.json > prisma.schema`) |
| Migración inicial | ✅ | `pnpm exec prisma migrate dev --name init` | `migrations/20260528033524_init/migration.sql` (583 líneas) — 17 tablas + 12 enums |
| Seed | ✅ | `pnpm db:seed` | 1 admin, 1 proyecto, 2 manzanas, 5 lotes, 2 clientes, 1 cuenta bancaria |
| Type check | ✅ | `pnpm exec tsc --noEmit` | 0 errores |
| Build | ✅ | `pnpm build` | `dist/` generado correctamente |
| Smoke test runtime | ✅ | `pnpm start` + `curl /health` | `200 { status: ok, db: connected }` |
| Validación end-to-end | ✅ | `POST /api/auth/login` con body válido | `500 "auth.service.login no implementado (Fase 3)"` — cadena router → rate-limit → validate → controller → asyncHandler → errorHandler funciona; falta sólo la lógica de servicios |

---

## Resumen de Fase 3.1.1 — Sistema de auditoría automática

> Cambio incremental: capacidad de capturar TODA acción CUD sobre entidades críticas, con before/after, sin tocar los services. Helper adicional para acciones explícitas (login, cancelaciones de negocio).

| Paso | Estado | Comando / Archivo | Resultado |
|---|---|---|---|
| Ampliar enum `AuditAction` | ✅ | `schema-common.prisma` | +6 valores: `RESTORE`, `LOGIN_FAILED`, `PASSWORD_CHANGE`, `ROLE_CHANGE`, `EXPORT`, `IMPORT` (total 17) |
| Nuevo enum `AuditStatus` | ✅ | `schema-common.prisma` | `SUCCESS` / `FAILED` para distinguir intentos fallidos (login con password incorrecto) |
| Campos `status` y `requestId` en `AuditLog` | ✅ | `schema-users.prisma` | `status` con default `SUCCESS`; `requestId` opcional para agrupar audits de una misma request HTTP |
| Índice compuesto `(entity, entityId, createdAt)` | ✅ | `schema-users.prisma` | Permite consultar "timeline de la entidad X" eficientemente |
| Migración | ✅ | `pnpm exec prisma migrate dev --name expand_audit_log` | `migrations/20260528043147_expand_audit_log/migration.sql` |
| Sanitización de campos sensibles | ✅ | `src/lib/auditSanitize.ts` | Denylist recursiva: `password`, `token`, `refreshToken`, `apiKey`, `secret`, etc. → `[REDACTED]` |
| Helper de auditoría explícita | ✅ | `src/lib/audit.ts` | `writeAuditLog()`, `listAuditLogs()`, `getEntityTimeline()` — para escrituras manuales con contexto (login, cancelaciones, etc.) |
| Extension Prisma | ✅ | `src/lib/prismaAuditExtension.ts` | Captura CUD automática sobre 10 modelos: `User, Client, Contract, ContractLot, Payment, Lot, CashSession, BankAccount, Block, Project` |
| Cliente Prisma extendido | ✅ | `src/lib/prisma.ts` | El singleton ya devuelve el cliente con la extensión aplicada |
| Tipo `TxClient` para transacciones | ✅ | `src/lib/prismaTypes.ts` | Reemplaza `Prisma.TransactionClient` (no funciona con cliente extendido) |
| Test runtime | ✅ | `node -e` create/update/delete sobre `bank_accounts` | 3 entradas en `audit_logs` con `action` y `before`/`after` correctos |
| Sanitización verificada | ✅ | `node -e` con objeto que contiene password, token, refreshToken | Todos los campos sensibles aparecen como `[REDACTED]` (incluido en arrays y objetos anidados) |
| Dockerfile | ✅ | `COPY migrations ./migrations` en builder y production stage | Las migraciones viajan a Railway (antes solo se copiaba `prisma/`) |
| Build | ✅ | `pnpm exec tsc --noEmit` + `pnpm build` | 0 errores |

---

## Stack

| Capa | Versión instalada |
|---|---|
| Node.js | 22.19.0 |
| TypeScript | 5.9.3 |
| Express | 4.22.2 |
| Prisma | 5.22.0 (CLI + cliente) |
| PostgreSQL | 16.14 (Alpine, en container `mi-postgres`) |
| Zod | 3.25.76 |
| jsonwebtoken | 9.0.3 |
| bcryptjs | 2.4.3 |
| express-rate-limit | 7.5.1 |
| pnpm | 9.1.0 |

---

## Infraestructura local activa

| Container | Imagen | Puerto host | Uso |
|---|---|---|---|
| `mi-postgres` | postgres:16-alpine | 5432 | Base de datos (`mi_base_de_datos`, usuario `admin`) |
| `mi-pgadmin` | dpage/pgadmin4:latest | 8080 | UI de administración (`lyuman737@gmail.com`) |
| `mi-postgres-mcp` | crystaldba/postgres-mcp:latest | 8000 | MCP server para inspección desde el IDE |

> Estos contenedores NO vienen del `docker-compose.yml` del proyecto — son un stack externo ya levantado. El backend se conecta a `localhost:5432` desde Windows host. Si más adelante se quiere migrar al compose del proyecto, basta con apuntar `DATABASE_URL` al host `db` y la red interna.

### Tablas creadas en `mi_base_de_datos`

```
audit_logs                client_gestors        contract_lots             gestors
bank_accounts             client_occupations    contracts                 lots
blocks                    clients               down_payment_installments payment_applications
cash_sessions             _prisma_migrations    payment_schedules         payments
                                                                          projects
                                                                          users
```

17 tablas de negocio + `_prisma_migrations`. 12 tipos `ENUM` registrados como tipos PostgreSQL.

### Datos de seed verificados

```
 bank_accounts |     1
 blocks        |     2
 clients       |     2
 lots          |     5
 projects      |     1
 users         |     1   (admin / admin123, bcrypt $2a$12$…)
```

---

## Cambios y decisiones de esta fase

| Cambio | Razón |
|---|---|
| `package.json > prisma.schema = "./prisma"` | Con `previewFeatures = ["prismaSchemaFolder"]`, Prisma 5.22 requiere apuntar a la carpeta (no a un archivo). Sin esto fallaba con `"You don't have any models defined in your schema.prisma"`. |
| Quitar `declaration: true` y `declarationMap: true` de `tsconfig.json` | Con pnpm + `strict: true`, TypeScript pedía declaraciones explícitas para todos los handlers Express porque las dependencias transitivas (`@types/express-serve-static-core`, `@types/qs`) viven en `.pnpm/…`. Las declaration files no son necesarias para una app (sí lo serían para una librería publicable). |
| `Dockerfile` build stage: copiar `prisma/` y correr `prisma generate` antes de `tsc` | El build necesita los tipos de `@prisma/client`. Sin esto el build en Railway fallaría. |
| `Dockerfile` production stage: copiar `prisma/` + `node_modules/@prisma` y `node_modules/.prisma` del builder | `prisma migrate deploy` (pre-deploy en Railway) necesita el schema y las migraciones; el binario del query engine debe acompañar al cliente generado. Más eficiente que regenerar en runtime. |
| `docker-compose.yml`: defaults inline removidos, usar `${VAR:?…}` | GitGuardian marcaba `${VAR:-default}` como credenciales filtradas. Ahora Compose falla rápido si una variable falta en `.env`. |
| `releasedAt` + `releaseReason` en `ContractLot` | Trazabilidad cuando un lote se libera de un contrato (cancelación parcial), sin perder la línea histórica. Sugerencia del review previo. |
| `migrations/` está en `backend/migrations/` (hermana de `prisma/`) | Convención de Prisma cuando se usa `prismaSchemaFolder` apuntando a la carpeta `./prisma`. Confirmado con `prisma migrate status` que detecta correctamente las 2 migraciones. El `Dockerfile` ahora copia `migrations/` además de `prisma/`. |
| Auditoría: `AuditStatus` enum (SUCCESS/FAILED) + campo `status` | Distinguir intentos fallidos (login con contraseña incorrecta) de las acciones exitosas. Default `SUCCESS` para no romper el ALTER sobre las filas existentes (cero hoy, pero importante para Railway). |
| Auditoría: campo `requestId` en `AuditLog` | Agrupar todos los entries generados por una misma request HTTP (ej: crear un contrato puede generar 5+ entries — todos comparten requestId). |
| Auditoría: índice compuesto `(entity, entityId, createdAt)` | Habilita queries del tipo "ver toda la historia del contrato X en orden cronológico" sin scan. |
| Auditoría: dos caminos (extension Prisma + helper explícito) | Captura automática de CUD sin disciplina del developer + escrituras manuales con contexto cuando se necesita razón/notas (login fallido, cancelación con motivo). |
| Auditoría: sanitización por denylist | Lista hardcoded de campos sensibles (`password`, `token`, `refreshToken`, etc.) que se reemplazan por `[REDACTED]` recursivamente antes de persistir. Si el día de mañana un service llega a recibir un password en plaintext y lo pasa a `prisma.user.update`, NUNCA llega al log. |
| `TxClient` type en `src/lib/prismaTypes.ts` | Con `prisma.$extends(...)`, `Prisma.TransactionClient` ya no encaja con el tx que recibe el callback de `$transaction`. `TxClient` se deriva del cliente extendido vía `Parameters<...>`. |

---

## Módulos — estado actualizado

| Módulo | Schema DB | Tablas creadas | Routes | Validators | Repository | Service | Controller |
|---|---|---|---|---|---|---|---|
| auth | ✅ | (usa `users`) | ✅ | ✅ | — | 🚧 stubs | ✅ |
| projects | ✅ | `projects`, `blocks`, `lots` | ✅ | ✅ | ✅ | 🚧 stubs (3 lecturas funcionan vía repository) | ✅ |
| clients | ✅ | `clients`, `client_occupations`, `gestors`, `client_gestors` | ✅ | ✅ | ✅ | 🚧 stubs | ✅ |
| contracts | ✅ | `contracts`, `contract_lots`, `payment_schedules`, `down_payment_installments` | ✅ | ✅ | ✅ + `transactions.ts` | 🚧 stubs | ✅ |
| payments | ✅ | `payments`, `payment_applications` | ✅ | ✅ | ✅ + `transactions.ts` + `calculations.ts` | 🚧 stubs | ✅ |
| cash | ✅ | `cash_sessions` | ✅ | ✅ | ✅ | 🚧 stubs | ✅ |
| users | ✅ | `users` | ✅ | ✅ | ✅ | 🚧 stubs (toggleActive sí funciona) | ✅ |
| common | ✅ | `bank_accounts`, `audit_logs` | — | — | — | — | — |

Leyenda: ✅ completo · 🚧 estructura/firmas · ⏳ pendiente

---

## Sistema de auditoría (Fase 3.1.1)

### Qué captura

La tabla `audit_logs` recibe entradas en dos formas:

**1. Automática (vía Prisma `$extends`)** — toda operación `create`, `update`, `delete`, `upsert`, `updateMany`, `deleteMany` sobre los modelos:

| Modelo | Entidad en `audit_logs.entity` |
|---|---|
| `User` | `users` |
| `Client` | `clients` |
| `Contract` | `contracts` |
| `ContractLot` | `contract_lots` |
| `Payment` | `payments` |
| `Lot` | `lots` |
| `CashSession` | `cash_sessions` |
| `BankAccount` | `bank_accounts` |
| `Block` | `blocks` |
| `Project` | `projects` |

Cada entrada lleva: `action` (CREATE/UPDATE/DELETE), `status` (SUCCESS por defecto), `entity`, `entityId`, `beforeData`, `afterData`, y los campos de contexto (`userId`, `requestId`, `ipAddress`, `userAgent`) si vienen del request.

**2. Explícita (vía `writeAuditLog`)** — para acciones que necesitan contexto adicional o que no caen en CUD: login OK/FAILED, logout, cancelar contrato con razón, cambiar rol, generar export, etc.

```typescript
import { writeAuditLog } from "../lib/audit";

await writeAuditLog({
  action: "LOGIN_FAILED",
  status: "FAILED",
  entity: "users",
  entityId: attemptedUsername,    // username intentado (no hay UUID si el usuario no existe)
  userId: null,
  ipAddress: req.ip,
  userAgent: req.headers["user-agent"],
  notes: "Contraseña inválida",
});
```

### Sanitización de datos sensibles (denylist)

`src/lib/auditSanitize.ts` filtra recursivamente estos campos y los reemplaza por `[REDACTED]`:

```
password, passwordHash, hash,
token, accessToken, refreshToken,
secret, apiKey, api_key,
authorization, cookie,
creditCard, cvv, pin
```

Aplica a objetos planos, anidados y dentro de arrays. Se ejecuta automáticamente en ambos caminos (extension y helper). No requiere acción del caller.

### Contexto del request (userId, requestId, ipAddress, userAgent)

`src/lib/prismaAuditExtension.ts` lee un `AsyncLocalStorage` (`auditContextStore`) que debe ser llenado por un middleware Express antes de cada request. **El middleware aún no está implementado** — pendiente para Fase 3.2 junto con `auth.middleware`. Mientras tanto, las entradas de auditoría se crean con esos campos en `null` (la acción queda capturada, falta el "quién").

Esqueleto del middleware (Fase 3.2):

```typescript
import { randomUUID } from "node:crypto";
import { runWithAuditContext } from "../lib/prismaAuditExtension";

export function auditContextMiddleware(req, res, next) {
  runWithAuditContext({
    userId: req.user?.id ?? null,
    requestId: randomUUID(),
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] ?? null,
  }, () => next());
}
```

### Lectura de auditoría

```typescript
import { listAuditLogs, getEntityTimeline } from "../lib/audit";

// Búsqueda con filtros
const [logs, total] = await listAuditLogs({
  entity: "contracts",
  action: "CONTRACT_CANCELLED",
  from: new Date("2026-01-01"),
  skip: 0,
  take: 50,
});

// Línea de tiempo de UNA entidad concreta (usa el índice compuesto)
const timeline = await getEntityTimeline("contracts", "<uuid>");
```

Aún no expuesto vía REST. Cuando se implemente, sólo `ADMIN` y `OWNER` deberían poder consultarlo (`docs/API.md` lo documenta como pendiente).

### Limitaciones conocidas

- **`updateMany` / `deleteMany`**: no se leen las filas afectadas (sería costoso). Se loguea con `entityId = "bulk:<count>"` y el filtro WHERE en `before/after`.
- **`upsert`**: se trata como `UPDATE` si había fila previa, `CREATE` si no.
- **Auditoría dentro de `$transaction`**: el log comparte la misma tx — si el negocio hace rollback, el log también se descarta. Esto es deliberado (no auditar acciones que no pasaron).
- **Sin `userId` aún**: hasta que el middleware HTTP de auth llene `auditContextStore`, las entradas quedan con `userId = null`. La estructura ya está lista; sólo falta conectar el middleware con el JWT verificado.

---

## Cómo retomar localmente

```bash
# 1. Asegurarse que mi-postgres está corriendo
docker ps --filter name=mi-postgres

# 2. Entrar al backend
cd backend

# 3. (Solo la primera vez por máquina)
npm install -g pnpm@9.1.0
pnpm install

# 4. Verificar conexión y estado de migraciones
pnpm exec prisma migrate status
# Expect: "1 migration found in prisma/migrations" + "Database schema is up to date!"

# 5. Levantar el dev server
pnpm dev
# o `pnpm start` para servir desde `dist/`

# 6. Probar
curl http://localhost:4000/health
# {"status":"ok","db":"connected","timestamp":"..."}
```

### Inspección de DB

Guía completa: [docs/DOCKER-DB-GUIDE.md](DOCKER-DB-GUIDE.md).

```bash
# Vía docker (atajo)
docker exec mi-postgres psql -U admin -d mi_base_de_datos -c "\dt"

# Vía pgAdmin
# http://localhost:8080 → lyuman737@gmail.com / ingsoft1!

# Vía Prisma Studio
cd backend && pnpm db:studio    # http://localhost:5555
```

---

## Convenciones del schema final

### Columnas en camelCase (no snake_case)

Las tablas usan `@@map("snake_case")` para los nombres de tabla, pero las columnas mantienen el camelCase del modelo Prisma (`lotNumber`, `blockId`, `basePrice`, etc.). Esto significa que las queries SQL crudas deben usar comillas dobles: `SELECT "lotNumber" FROM lots`.

**Por qué se dejó así:** mapear cada columna a snake_case requeriría agregar `@map()` a casi todos los campos, contaminando el schema. Para queries SQL crudas (raras en este proyecto) basta con comillar identificadores; Prisma client traduce internamente sin problema.

### Constraints únicos compuestos clave

- `Lot @@unique([blockId, lotNumber])` — identificación única de lote
- `Block @@unique([projectId, name])` — manzana única por proyecto
- `ContractLot @@unique([contractId, lotId])` — un lote no se repite en un mismo contrato
- `PaymentSchedule @@unique([contractId, installmentNumber])`
- `ClientGestor @@unique([clientId, gestorId])`

### Índices estratégicos creados

- `Lot`: `blockId`, `status`, `type`
- `Client`: `fullName`, `phone`, `email`, `dpi` (unique)
- `Contract`: `clientId`, `gestorId`, `status`, `contractDate`
- `ContractLot`: `releasedAt` (para filtrar lotes vigentes vs liberados)
- `Payment`: `contractId`, `paymentDate`, `method`, `cashSessionId`
- `PaymentSchedule`: `dueDate`, `status`
- `CashSession`: `status`, `openedAt`, `openedById`
- `AuditLog`: `userId`, `entity`, `entityId`, `action`, `createdAt`

---

## Pendiente — Fase 3.2 (lógica de servicios)

1. **Implementar la lógica de los services** (todos están en stub):
   - `auth.service`: login (verify password + sign JWTs + update lastLoginAt), refresh, logout. **Empezar por aquí** — desbloquea poder probar todo lo demás autenticado.
   - `users.service`: hash de password al crear/actualizar, validaciones.
   - `projects.service`: CRUD con validación de unicidad de `projectId+name` para blocks y `blockId+lotNumber` para lots.
   - `clients.service`: CRUD + búsqueda + alta de gestores (link o inline) + generación de `code` correlativo (`CLI-YYYY-####`).
   - `contracts.service`: **el más complejo**. Creación dentro de `prisma.$transaction`:
     1. Validar disponibilidad de todos los lotes
     2. Reservar lotes (status → RESERVED)
     3. Generar número correlativo `CONT-YYYY-####`
     4. Calcular totalAmount, financedAmount, cuota nivelada
     5. Crear `Contract` + `ContractLot[]`
     6. Generar `PaymentSchedule[]` (amortización francesa)
     7. Generar `DownPaymentInstallment[]` si fraccionado
     8. Registrar AuditLog
   - `payments.service`: registrar pago (waterfall mora→interés→capital), aplicación a múltiples cuotas, saldo a favor, advance payment (recalcular schedule), generar receipt PDF.
   - `cash.service`: abrir/cerrar sesión, calcular esperado al cierre, registrar discrepancia.
2. **Generadores de códigos correlativos** para `Client.code`, `Contract.contractNumber`, `Payment.receiptNumber`.
3. **AuditLog wrapper** que registre before/after en operaciones CRUD críticas.
4. **Tests** (Vitest o Jest) — unidad para `utils/calculations` (cuota nivelada, mora, amortización) y `payments.service` waterfall; integración para creación de contratos.
5. **Implementar `lib/pdf.ts`** — generación de boletas con pdfkit o puppeteer.

---

## Pendiente — Fase 4 (frontend)

Páginas y componentes. No iniciado.

---

## Variables de entorno (estado actual)

| Variable | Servicio | Valor en `.env` local | Notas |
|---|---|---|---|
| `DATABASE_URL` | backend | `postgresql://admin:ingsoft1@localhost:5432/mi_base_de_datos` | Apunta al container `mi-postgres` |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | (compose) | `admin` / `ingsoft1` / `mi_base_de_datos` | Sólo se usan si se levanta el compose del proyecto |
| `JWT_SECRET` | backend | 64 chars random base64 (generado con `crypto.randomBytes(48)`) | ≥16 chars validados por Zod |
| `JWT_REFRESH_SECRET` | backend | 64 chars random base64 (distinto del anterior) | |
| `JWT_EXPIRES_IN` | backend | `15m` | |
| `JWT_REFRESH_EXPIRES_IN` | backend | `7d` | |
| `NODE_ENV` | backend | `development` | |
| `PORT` | backend | `4000` | |
| `FRONTEND_URL` | backend | `http://localhost:5173` | |
| `BCRYPT_SALT_ROUNDS` | backend | `12` | Confirmado en hash del admin del seed |
| `LOGIN_RATE_LIMIT` | backend | `10` | intentos/minuto/IP |

---

## Deployment a Railway — estado

- `backend/railway.toml` tiene `preDeployCommand = "pnpm exec prisma migrate deploy"` — listo para aplicar `migrations/20260528033524_init` en el primer deploy.
- `backend/Dockerfile` actualizado para copiar `prisma/` en build (necesario para `prisma generate`) y en production stage (necesario para `prisma migrate deploy` en runtime).
- `frontend/railway.toml` sin cambios — sigue funcional desde Fase 1.
- Falta generar `pnpm-lock.yaml` y commitearlo antes del primer deploy (los Dockerfiles usan `--frozen-lockfile`).
