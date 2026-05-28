---
name: gestionlotes-db
description: Use this skill when the user wants to modify the GestionLotes database — add/remove/rename tables, columns, indexes, enums, foreign keys; reset the DB; troubleshoot Prisma migrations; or any change that touches `prisma/schemas/*.prisma`. Activate for keywords like "agregar tabla", "nueva columna", "modificar schema", "migración", "migrate", "Prisma", "drift", "Railway deploy", "borrar la base de datos", "resetear DB". Prevents drift between local DB and the migrations that Railway will replay.
---

# GestionLotes — Modificaciones seguras a la base de datos

> **Propósito:** evitar que cambios locales rompan la coherencia entre la DB local (`mi-postgres`) y lo que Railway replicará a futuro. La regla maestra: **toda modificación de estructura DEBE pasar por una migración Prisma versionada**.

---

## Contexto del proyecto (obligatorio leer antes de tocar nada)

- Repo: `GestionLotes-main` (monorepo)
- Backend: `backend/` — Express + Prisma + TypeScript
- Schema Prisma modular: `backend/prisma/schemas/*.prisma` (6 archivos por dominio)
- Migraciones: `backend/prisma/migrations/<timestamp>_<nombre>/migration.sql`
- DB local: container Docker `mi-postgres` en `localhost:5432`
  - Usuario: `admin`
  - Password: `ingsoft1`
  - DB: `mi_base_de_datos`
- Railway: **NO conectado todavía**. Se conectará cuando el sistema esté maduro. Hasta entonces los cambios viven solo localmente, pero deben quedar correctamente versionados en `prisma/migrations/` para que el deploy futuro sea limpio.

Documentos relacionados (leerlos si la modificación es no trivial):

- `docs/STATE.md` — estado actual del schema y módulos
- `docs/DOCKER-DB-GUIDE.md` — psql, pgAdmin, troubleshooting
- `docs/API.md` — endpoints (útil para verificar qué módulos pueden romperse)
- `backend/CONFIG-NOTES.md` — decisiones de configuración (tsconfig, pnpm, Dockerfile, lockfile). **Léelo antes de tocar configs.**

---

## Trampas conocidas en este proyecto (LEER ANTES DE TOCAR)

| Trampa | Detalle |
|---|---|
| Las migraciones viven en `backend/migrations/` (NO en `backend/prisma/migrations/`) | Con `previewFeatures = ["prismaSchemaFolder"]` apuntando a `./prisma`, Prisma las pone como hermanas. El CLI dice `"X migrations found in prisma/migrations"` pero el path REAL es `backend/migrations/`. El Dockerfile copia ambas. |
| El cliente Prisma exportado en `src/lib/prisma.ts` es EXTENDIDO con audit | El tipo `Prisma.TransactionClient` ya no encaja. Usar `TxClient` de `src/lib/prismaTypes.ts`. |
| Auditoría: lista bloqueada `FORBIDDEN_AUDIT_MODELS` contiene `AuditLog` | Es el guard anti-recursión. Si lo quitas, cada CREATE de audit_log dispara otro create de audit_log → bucle infinito. |
| `prisma` + `@prisma/client` están pinneados en versión EXACTA | Acoplados — mismatch causa "Engine version mismatch". Actualizar ambos a la vez. |
| `declaration: true` en `tsconfig.json` rompe con pnpm + Express types | Por eso está OFF. No reactivar sin leer `backend/CONFIG-NOTES.md` sección 1. |
| El seed usa el cliente Prisma BASE (no extendido) | Intencional — no queremos audit logs del bootstrap. Si necesitas auditar el seed por alguna razón, importa el cliente extendido explícitamente. |
| `prisma generate` en producción Docker está DUPLICADO (builder + production stage) | Intencional. En production stage REGENERA en vez de copiar de builder porque pnpm usa symlinks que no sobreviven `COPY --from`. |

---

## REGLAS DE ORO (nunca romperlas)

1. **NUNCA modificar la DB con `ALTER TABLE`, `CREATE INDEX`, `DROP TABLE`, etc. directos en psql/pgAdmin/MCP.** Esos cambios NO se replican a Railway. Único camino válido: editar `schema.prisma` + `prisma migrate dev`.

2. **NUNCA editar un archivo `migration.sql` que ya fue aplicado.** Prisma chequea hashes; modificar uno aplicado rompe el historial y futuras DBs (incluida la de Railway) no podrán reproducirlo. Si está mal, crear una migración correctiva nueva.

3. **NUNCA borrar carpetas de `migrations/` manualmente.** Cada migración representa un paso histórico. Borrarlas hace que Railway pierda el camino para reconstruir.

4. **SIEMPRE generar las migraciones DESDE el backend con `pnpm exec prisma migrate dev`.** No usar `npx prisma` ni instalar Prisma global — el proyecto usa pnpm 9.

5. **SIEMPRE commitear juntos** los cambios del schema Y la nueva carpeta `migrations/<timestamp>_xxx/`. Si solo subes el schema, otra máquina (o Railway) no tendrá la migración correspondiente.

6. **Los enums son tipos PostgreSQL — agregar/quitar valores requiere migración.** No basta con editar el enum en TypeScript.

7. **Los campos `Decimal` para dinero NO se cambian a `Float`.** Si necesitas cambiar la precisión, usa `@db.Decimal(p, s)` con nueva precisión y crea migración.

8. **NUNCA agregar `AuditLog` a `AUDITED_MODELS`** en `src/lib/prismaAuditExtension.ts`. Auditaría sus propias inserciones → recursión infinita. Existe un guard `FORBIDDEN_AUDIT_MODELS` que lo bloquea, pero la primera línea de defensa es la disciplina.

9. **NUNCA usar `Prisma.TransactionClient` como tipo** en callbacks de `$transaction`. Usar `TxClient` de `src/lib/prismaTypes.ts`. Con el cliente extendido (auditoría), el tipo de la librería ya no encaja.

10. **NUNCA actualizar `prisma` sin actualizar `@prisma/client` a la misma versión** (y viceversa). Están acoplados; un mismatch causa "Engine version mismatch" en runtime. Ambos están pinneados en versión EXACTA en `package.json` por esta razón.

11. **NUNCA hacer `pnpm install --no-frozen-lockfile`** salvo que estés deliberadamente actualizando dependencias. CI/Docker SIEMPRE con `--frozen-lockfile`.

---

## Cuándo activar este skill

Activar cuando el usuario pida cualquiera de:

- Agregar / modificar / eliminar tablas, columnas, índices, enums, foreign keys
- Cambiar tipos de datos
- Renombrar campos o modelos
- Agregar/quitar `@@unique`, `@@index`, `@@map`
- "Resetear la base de datos"
- "Volver a un estado anterior"
- Diagnosticar `drift detected` o errores de migración
- Preparar el primer deploy a Railway
- Implementar una nueva entidad de negocio (cliente nuevo tipo, nuevo módulo, etc.)

---

## Flujo estándar para cambios al schema

### Paso 0 — Verificar punto de partida

```powershell
docker ps --filter name=mi-postgres
cd backend
pnpm exec prisma migrate status
```

Debe decir `"Database schema is up to date!"`. Si no, parar y arreglar primero el drift (ver sección Troubleshooting).

### Paso 1 — Editar el schema modular

Identificar el archivo correcto según dominio:

| Dominio | Archivo |
|---|---|
| Proyectos, Manzanas, Lotes | `backend/prisma/schemas/schema-projects.prisma` |
| Clientes, Ocupación, Gestores | `backend/prisma/schemas/schema-clients.prisma` |
| Contratos, ContractLot, PaymentSchedule, DownPaymentInstallment | `backend/prisma/schemas/schema-contracts.prisma` |
| Pagos, Aplicaciones, Caja | `backend/prisma/schemas/schema-payments.prisma` |
| Usuarios, AuditLog | `backend/prisma/schemas/schema-users.prisma` |
| Enums compartidos, BankAccount | `backend/prisma/schemas/schema-common.prisma` |

**Si el cambio cruza dominios** (ej: nuevo modelo que pertenece a varios), añadirlo donde tenga más sentido semánticamente; no fragmentar.

### Paso 2 — Convenciones obligatorias del schema

Cuando agregues un modelo nuevo, asegurar:

```prisma
model NuevoModelo {
  id        String   @id @default(uuid())          // SIEMPRE UUID
  // ... campos ...

  createdAt DateTime @default(now())                // SIEMPRE
  updatedAt DateTime @updatedAt                     // SIEMPRE
  deletedAt DateTime?                               // si la entidad es "crítica" (clientes, contratos, lotes, usuarios)

  @@map("nuevo_modelos")                            // SIEMPRE snake_case en plural
}
```

Reglas adicionales:

- **Dinero**: `Decimal @db.Decimal(14, 2)` — nunca `Float` ni `Int` para centavos.
- **FK con `onDelete`**:
  - `Restrict` cuando borrar el padre destruiría historial (`Project → Block`, `Block → Lot`, `Lot → ContractLot`, `Contract → Payment`).
  - `Cascade` cuando el hijo no tiene sentido sin el padre y es accesorio (`Contract → ContractLot`, `Contract → PaymentSchedule`, `Payment → PaymentApplication`).
  - `SetNull` para referencias opcionales que pueden quedar huérfanas (`AuditLog → User`, `Payment → BankAccount`).
- **Únicos compuestos**: usar `@@unique([campo1, campo2])` con un comentario `///` explicando la regla de negocio.
- **Índices**: agregar `@@index` en campos de búsqueda/filtro frecuente. NO agregar índices "por si acaso".
- **Comentarios `///`** (triple slash) describen el campo/modelo y aparecen en el cliente Prisma.

### Paso 3 — Generar migración

```powershell
cd backend
pnpm exec prisma migrate dev --name <nombre_descriptivo>
```

Reglas para `<nombre_descriptivo>`:
- snake_case, en inglés, verbo + objeto
- ejemplos buenos: `add_block_discount`, `rename_client_dpi_to_id_document`, `drop_unused_lot_metadata`, `add_payment_reversal_status`
- ejemplos malos: `update`, `fix`, `changes`, `migration1`

El comando:
1. Compara `schema.prisma` con el estado de la DB.
2. Genera `backend/prisma/migrations/<timestamp>_<nombre>/migration.sql`.
3. Lo aplica a `mi-postgres`.
4. Regenera el cliente TypeScript (`@prisma/client`).

### Paso 4 — Inspeccionar el SQL generado

**OBLIGATORIO**. Antes de continuar, abrir y leer el `migration.sql` recién creado:

```powershell
ls backend/prisma/migrations/
cat backend/prisma/migrations/<timestamp>_<nombre>/migration.sql
```

Verificar:
- ¿El SQL hace lo que esperabas?
- ¿Hay algún `DROP COLUMN` o `DROP TABLE` no intencionado?
- ¿Las defaults son correctas para datos existentes?
- ¿Las foreign keys tienen el `ON DELETE` correcto?

Si algo está mal: **NO editar el archivo** (ya fue aplicado). Hacer una segunda migración que corrija (o revertir local con `prisma migrate reset` y empezar de nuevo si todavía no hiciste commit).

### Paso 5 — Verificar en la DB

```powershell
docker exec mi-postgres psql -U admin -d mi_base_de_datos -c "\d <tabla_afectada>"
docker exec mi-postgres psql -U admin -d mi_base_de_datos -c "SELECT * FROM _prisma_migrations ORDER BY started_at DESC LIMIT 3;"
```

### Paso 6 — Verificar build del backend

Si el cambio agrega/cambia/quita campos, el código TypeScript puede romperse. Comprobar:

```powershell
cd backend
pnpm exec tsc --noEmit
```

Si hay errores: arreglar los `validators`, `repository`, `service`, `controller` afectados. Buscar usos antiguos del campo:

```powershell
# Grep recomendado (desde el IDE/Claude — usar herramienta Grep)
# Buscar el nombre antiguo del campo en src/
```

### Paso 7 — Actualizar el seed si aplica

Si agregaste un campo NOT NULL sin default, o un modelo nuevo, ajustar `backend/prisma/seeds/seed.ts` para que pueble el nuevo campo. Después:

```powershell
pnpm exec prisma migrate reset    # SOLO si estás en desarrollo y no te importa perder datos locales
```

`migrate reset` recrea la DB desde cero aplicando todas las migraciones y luego ejecuta el seed. Útil para confirmar que todo el camino reproduce el estado correctamente — eso es exactamente lo que Railway hará.

### Paso 8 — Actualizar `docs/STATE.md`

Agregar el cambio a la sección correspondiente: nueva tabla en el inventario, nuevo índice si aplica, decisión de arquitectura si la hubo.

### Paso 9 — Commit

```bash
git add backend/prisma/schemas/<archivo_modificado>.prisma
git add backend/prisma/migrations/<timestamp>_<nombre>/
git add backend/src/   # si hubo cambios en código
git add docs/STATE.md
git commit -m "feat(db): <descripción del cambio>"
```

**NUNCA** commitear solo el schema sin la migración, ni viceversa.

---

## Cómo "resetear" la base de datos

> Útil cuando quieres volver al estado limpio del seed, o cuando un experimento dejó datos inconsistentes.

### Opción A — Reset completo (recomendado para desarrollo)

```powershell
cd backend
pnpm exec prisma migrate reset
```

Esto:
1. `DROP DATABASE mi_base_de_datos`
2. `CREATE DATABASE mi_base_de_datos`
3. Re-aplica TODAS las migraciones en orden
4. Ejecuta el seed (`prisma/seeds/seed.ts`)

**El comando pedirá confirmación.** Para CI/scripts: `prisma migrate reset --force --skip-seed`.

### Opción B — Borrar solo datos, conservar schema

```powershell
docker exec mi-postgres psql -U admin -d mi_base_de_datos -c "
  TRUNCATE TABLE
    audit_logs, payment_applications, payments, payment_schedules,
    down_payment_installments, contract_lots, contracts,
    client_gestors, gestors, client_occupations, clients,
    lots, blocks, projects, bank_accounts, cash_sessions, users
  RESTART IDENTITY CASCADE;
"
cd backend && pnpm db:seed
```

### Opción C — Borrar el container entero (nuclear)

Solo si la DB está irreparablemente rota:

```powershell
docker stop mi-postgres
docker rm mi-postgres
docker volume ls               # buscar el volumen
docker volume rm <volumen>
# luego volver a levantar el container y re-aplicar migraciones
```

---

## Troubleshooting

### "drift detected: Your database schema is not in sync with your migration history"

**Causa**: alguien (o tú antes) modificó la DB con SQL directo sin pasar por migrations. La estructura real diverge del histórico de migrations.

**Diagnóstico**:
```powershell
pnpm exec prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datasource prisma/schema.prisma \
  --script
```
Eso muestra el SQL que faltaría para reconciliar.

**Fix opciones**:
1. **Reset duro (si es dev y no importa perder data)**: `prisma migrate reset`.
2. **Capturar el drift como nueva migración**: `prisma migrate dev --name capture_manual_changes` — Prisma genera el SQL del diff y lo aplica formalmente.
3. **Si el drift es solo en datos, no en estructura**: no es drift real, ignorar.

### "P3009: migrate found failed migrations"

Una migración anterior falló a la mitad. La DB quedó en estado inconsistente.

**Fix**: marcar la migración rota como rolled-back y re-aplicar:
```powershell
pnpm exec prisma migrate resolve --rolled-back <nombre_migración>
pnpm exec prisma migrate deploy
```

### "Cannot find module '@prisma/client'" después de pull

Faltó regenerar el cliente:
```powershell
cd backend
pnpm install
pnpm exec prisma generate
```

### "Environment variable not found: DATABASE_URL"

`backend/.env` no existe o no tiene la variable. Copiar de `.env.example` y completar.

### El cliente Prisma no tiene los nuevos tipos

`prisma generate` no corrió tras el último cambio:
```powershell
cd backend
pnpm exec prisma generate
# Y reiniciar el TS server del IDE (en VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server")
```

### `prisma migrate dev` dice "There is a migration that has not been applied to the database yet"

Otra máquina (o un branch) creó migraciones que tu DB local no tiene. Aplicar:
```powershell
pnpm exec prisma migrate deploy
```
(`deploy` aplica migraciones existentes sin generar nuevas.)

---

## Casos especiales

### Renombrar un campo o tabla

Prisma por defecto interpreta un rename como `DROP + CREATE` (pierde datos). Para conservarlos:

1. Editar el schema con el nuevo nombre + agregar `@map("nombre_antiguo")` o `@@map("tabla_antigua")`.
2. `prisma migrate dev --name rename_xxx --create-only` (no aplica).
3. **Editar manualmente** el `migration.sql` reemplazando los `DROP/CREATE` por `ALTER TABLE ... RENAME COLUMN ...` o `ALTER TABLE ... RENAME TO ...`.
4. `prisma migrate dev` (sin `--create-only`) para aplicar.

### Agregar columna NOT NULL a tabla con datos

Postgres requiere un default o el `ALTER` falla. Opciones:

- **A** (datos triviales, dev): `prisma migrate reset` y dejar que el seed pueble.
- **B** (datos importantes): hacer la migración en dos pasos:
  1. Agregar la columna como nullable + default.
  2. Backfill con SQL (puede ir en el mismo `migration.sql` editado manualmente).
  3. Otra migración que la haga NOT NULL.

### Agregar un valor a un enum

Editar el enum en `schema-common.prisma`, generar migración. Postgres requiere `ALTER TYPE` que Prisma sabe escribir. **Quitar** un valor es más complejo — Postgres no soporta `DROP VALUE` directo; hay que migrar valores existentes a uno nuevo, recrear el tipo y reasignar.

### Agregar un trigger / función / vista de Postgres

Prisma no las modela. Crear con `prisma migrate dev --create-only` y editar manualmente el `migration.sql` para añadir `CREATE FUNCTION ...` / `CREATE TRIGGER ...` / `CREATE VIEW ...`. Documentar en `docs/STATE.md` que existe lógica fuera de Prisma.

---

## Cómo afecta esto al deploy futuro a Railway

Cuando finalmente conectes Railway:

1. El primer deploy crea una DB vacía.
2. `backend/railway.toml` ejecuta `pnpm exec prisma migrate deploy` antes del start.
3. Railway aplica TODAS las migraciones de `prisma/migrations/` en orden.
4. La DB queda con la estructura final.
5. Los **datos** NO viajan — Railway empieza vacío. El seed NO corre automáticamente (configurarlo aparte si hace falta).

**Implicación práctica**: cualquier migración que funcione localmente con `migrate dev` funcionará en Railway con `migrate deploy`. La única forma de que algo "se rompa" en Railway es:

- Modificar la DB local sin migración → Railway nunca recibe el cambio.
- Editar un `migration.sql` ya aplicado → el hash deja de coincidir y Railway rechaza el deploy.
- Borrar carpetas de `migrations/` → Railway pierde pasos del camino.
- Commitear el schema sin la migración correspondiente → otras máquinas (incluida Railway) no tendrán el SQL.

---

## Cheat sheet rápida

```powershell
# Ver estado
pnpm exec prisma migrate status

# Crear+aplicar migración (la operación más común)
pnpm exec prisma migrate dev --name <descripción_snake_case>

# Solo generar el SQL sin aplicar (para revisar/editar)
pnpm exec prisma migrate dev --name <name> --create-only

# Resetear DB (dev only)
pnpm exec prisma migrate reset

# Aplicar migraciones existentes (sin crear nuevas) — como Railway en prod
pnpm exec prisma migrate deploy

# Regenerar cliente
pnpm exec prisma generate

# Ver SQL del diff entre schema y DB
pnpm exec prisma migrate diff --from-migrations prisma/migrations --to-schema-datasource prisma/schema.prisma --script

# Studio (UI web para datos)
pnpm db:studio
```

---

## Antes de terminar — checklist

Antes de decir "listo" sobre una modificación de DB:

- [ ] `pnpm exec prisma migrate status` dice `"Database schema is up to date!"`
- [ ] Existe la carpeta `backend/prisma/migrations/<timestamp>_<nombre>/` con `migration.sql`
- [ ] El `migration.sql` fue leído y hace lo esperado (no hay DROP sorpresa)
- [ ] `pnpm exec tsc --noEmit` pasa sin errores
- [ ] El seed se actualizó si aplica
- [ ] `docs/STATE.md` refleja el cambio (modelos, índices, decisiones)
- [ ] Todo el cambio (schema + migration + código + docs) está en un solo commit
