# API — GestionLotes

> Documentación de los endpoints REST del backend. Base URL: `http://localhost:4000`.
> Todos los endpoints excepto `/health`, `POST /api/auth/login` y `POST /api/auth/refresh` requieren un header
> `Authorization: Bearer <accessToken>`.

## Convenciones

- Roles: `ADMIN`, `OWNER`, `COLLECTOR`, `VIEWER`.
- Errores: `{ error: string, details?: any }` con código HTTP apropiado.
- Listados paginados aceptan `?page=1&limit=20`.

---

## Health

### `GET /health`
- **Auth:** no requiere
- **Response 200:** `{ "status": "ok", "db": "connected", "timestamp": ISO8601 }`
- **Response 503:** `{ "status": "error", "db": "disconnected" }`

---

## Auth — `/api/auth`

### `POST /api/auth/login`
- **Auth:** no
- **Rate limit:** 10/min por IP
- **Body:** `{ username: string, password: string }`
- **200:** `{ user: { id, username, email, fullName, role }, tokens: { accessToken, refreshToken } }`
- **401:** credenciales inválidas

### `POST /api/auth/refresh`
- **Auth:** no (lleva refresh token en body)
- **Body:** `{ refreshToken: string }`
- **200:** `{ accessToken, refreshToken }`

### `POST /api/auth/logout`
- **Auth:** sí
- **204:** sin cuerpo

---

## Projects — `/api/projects`

### `GET /api/projects`
- **Auth:** cualquier rol — **200:** lista paginada de proyectos.

### `POST /api/projects` *(ADMIN, OWNER)*
- **Body:** `{ name, description?, address?, isActive? }`
- **201:** proyecto creado.

### `GET /api/projects/:id`
- **200:** proyecto + sus manzanas.

### `PATCH /api/projects/:id` *(ADMIN, OWNER)*
- **Body:** campos del proyecto a actualizar.

---

## Blocks — `/api/projects/:projectId/blocks`

### `GET /api/projects/:projectId/blocks` — lista las manzanas del proyecto.

### `POST /api/projects/:projectId/blocks` *(ADMIN, OWNER)*
- **Body:** `{ name, description? }`

### `PATCH /api/projects/:projectId/blocks/:blockId` *(ADMIN, OWNER)*

---

## Lots — `/api/lots`

### `GET /api/projects/:projectId/blocks/:blockId/lots` — lista lotes de una manzana.

### `POST /api/projects/:projectId/blocks/:blockId/lots` *(ADMIN, OWNER)*
- **Body:** `{ lotNumber, area, basePrice, street?, isCorner?, status?, type?, metadata? }`

### `GET /api/lots/:id` — detalle de lote (incluye manzana y proyecto).

### `PATCH /api/lots/:id` *(ADMIN, OWNER)*

### `GET /api/lots/search?project=&block=&number=&status=&page=&limit=`
- Búsqueda paginada.

---

## Clients — `/api/clients`

### `GET /api/clients` — listado paginado.

### `POST /api/clients`
- **Body:** datos del cliente y, opcionalmente, `occupation: { ... }`.

### `GET /api/clients/:id` — detalle (incluye occupation y gestors).

### `PATCH /api/clients/:id`

### `GET /api/clients/:id/gestors` — gestores asociados al cliente.

### `POST /api/clients/:id/gestors`
- **Body:** `{ linkedClientId? }` o datos inline `{ fullName, dpi?, phone?, ... }`.

### `GET /api/clients/search?dpi=&name=&phone=`

---

## Contracts — `/api/contracts`

### `GET /api/contracts` — listado paginado.

### `POST /api/contracts` *(ADMIN, OWNER)*
- **Body:**
  ```json
  {
    "clientId": "uuid",
    "gestorId": "uuid?",
    "contractDate": "ISO?",
    "lots": [{ "lotId": "uuid", "priceAtContract": number, "discount": number, "notes": "?" }],
    "downPaymentAmount": number,
    "isDownPaymentInstallment": boolean,
    "downPaymentInstallments": [{ "installmentNumber": int, "dueDate": ISO, "amount": number }]?,
    "termYears": int?,
    "numberOfPayments": int?,
    "annualRate": number?,
    "firstPaymentDate": ISO?,
    "notes": "?"
  }
  ```
- **201:** contrato con calendario de pagos generado.
- **Errores:** 409 si algún lote no está disponible o está en otro contrato activo.

### `GET /api/contracts/:id` — contrato + lotes + calendario + cuotas de enganche.

### `PATCH /api/contracts/:id` *(ADMIN, OWNER)*
- **Body:** `{ status?, notes? }`.

### `POST /api/contracts/:id/cancel` *(ADMIN, OWNER)*
- **Body:** `{ reason: string }`.

### `POST /api/contracts/:id/lots/add` *(ADMIN, OWNER)*
- **Body:** `{ lots: [{ lotId, priceAtContract, discount }] }`.

### `POST /api/contracts/:id/lots/remove` *(ADMIN, OWNER)*
- **Body:** `{ lotIds: string[], cancelIfEmpty: boolean }`.

### `GET /api/contracts/:id/payment-schedule` — tabla de amortización.

### `GET /api/contracts/search?number=&client=&status=`

---

## Payments — `/api/payments`, `/api/contracts/:contractId/payments`

### `GET /api/contracts/:contractId/payments` — pagos de un contrato.

### `POST /api/contracts/:contractId/payments` *(ADMIN, OWNER, COLLECTOR)*
- **Body:**
  ```json
  {
    "paymentDate": "ISO?",
    "amountDue": number,
    "amountPaid": number,
    "method": "CASH | TRANSFER | DEPOSIT | CHECK",
    "appliesToScheduleIds": ["uuid"]?,
    "isAdvancePayment": boolean,
    "bankAccountId": "uuid?",
    "voucherNumber": "?",
    "checkNumber": "?",
    "checkBank": "?",
    "notes": "?"
  }
  ```
- **201:** pago registrado con aplicaciones.

### `GET /api/payments/:id` — detalle de pago.

### `POST /api/payments/:id/receipt` — PDF de la boleta.

### `GET /api/payments/search?contract=&client=&dateFrom=&dateTo=`

---

## Cash — `/api/cash/sessions`

### `GET /api/cash/sessions` — listado paginado.

### `GET /api/cash/sessions/active` — sesión actualmente abierta (o `null`).

### `POST /api/cash/sessions` *(ADMIN, OWNER, COLLECTOR)*
- **Body:** `{ openingAmount: number, notes? }`.

### `GET /api/cash/sessions/:id` — detalle (con payments).

### `GET /api/cash/sessions/:id/movements` — pagos en efectivo de la sesión.

### `POST /api/cash/sessions/:id/close` *(ADMIN, OWNER, COLLECTOR)*
- **Body:** `{ countedAmount: number, notes? }`.
- Calcula `difference = countedAmount - expectedAmount`. Si !=0, status=`DISCREPANCY`.

---

## Users — `/api/users` *(ADMIN, OWNER)*

### `GET /api/users` — listado paginado (sin password).
### `POST /api/users` — `{ username, email, password, fullName, role }`.
### `GET /api/users/:id`
### `PATCH /api/users/:id` — actualiza datos / cambia rol / cambia password.
### `PATCH /api/users/:id/toggle-active` — alterna `isActive`.

---

## Audit — `/api/audit` *(ADMIN, OWNER)* — pendiente Fase 3.2

> **Estado actual**: la captura ya funciona. Los endpoints REST de consulta están planeados pero aún NO expuestos.

La tabla `audit_logs` se llena automáticamente con todas las operaciones CUD sobre entidades críticas (`users, clients, contracts, contract_lots, payments, lots, cash_sessions, bank_accounts, blocks, projects`), incluyendo snapshots `beforeData`/`afterData` saneados (sin passwords ni tokens).

Endpoints planeados:

### `GET /api/audit` *(ADMIN, OWNER)* — buscar entradas
- **Query**: `entity, entityId, userId, action, status, requestId, from, to, page, limit`
- **200**: lista paginada de `AuditLog` con el `user` asociado (si lo hay)

### `GET /api/audit/entity/:entity/:entityId` *(ADMIN, OWNER)* — línea de tiempo
- Devuelve TODO el historial de UNA entidad en orden cronológico ascendente. Usa el índice compuesto `(entity, entityId, createdAt)`.

### Estructura de cada `AuditLog`

```json
{
  "id": "uuid",
  "userId": "uuid | null",
  "user": { "id": "...", "username": "...", "fullName": "...", "role": "..." } | null,
  "action": "CREATE | UPDATE | DELETE | RESTORE | CANCEL | LOGIN | LOGIN_FAILED | LOGOUT | PASSWORD_CHANGE | ROLE_CHANGE | PAYMENT_REGISTERED | CONTRACT_CANCELLED | LOT_STATUS_CHANGED | CASH_SESSION_OPENED | CASH_SESSION_CLOSED | EXPORT | IMPORT",
  "status": "SUCCESS | FAILED",
  "entity": "users | clients | contracts | ...",
  "entityId": "uuid (o username intentado para LOGIN_FAILED)",
  "beforeData": { /* JSONB saneado, null para CREATE */ },
  "afterData":  { /* JSONB saneado, null para DELETE */ },
  "requestId":  "uuid | null  // agrupa entries de la misma request HTTP",
  "ipAddress":  "string | null",
  "userAgent":  "string | null",
  "notes":      "string | null",
  "createdAt":  "ISO8601"
}
```

### Campos saneados (siempre redacted en `beforeData`/`afterData`)

`password, passwordHash, hash, token, accessToken, refreshToken, secret, apiKey, api_key, authorization, cookie, creditCard, cvv, pin`.

Aplica recursivamente sobre objetos anidados y arrays.

---

## Códigos de error comunes

| Código | Significado |
|---|---|
| 400 | Bad Request (datos malformados) |
| 401 | Unauthorized (token faltante o inválido) |
| 403 | Forbidden (rol insuficiente) |
| 404 | Not Found |
| 409 | Conflict (lote ya tomado, duplicado, etc.) |
| 422 | Validation Error (Zod) |
| 500 | Internal Server Error |
