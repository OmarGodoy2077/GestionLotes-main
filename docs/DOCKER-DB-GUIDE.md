# Guía — Usar Docker e inspeccionar la base de datos

> Cómo verificar el estado de los contenedores, conectarse a Postgres dentro de Docker, ejecutar queries, inspeccionar el schema, y resolver problemas comunes.

---

## 1. Lo que tienes corriendo

En este proyecto hay **tres contenedores externos** (levantados fuera del `docker-compose.yml` del proyecto):

| Container | Imagen | Puerto host | Para qué sirve |
|---|---|---|---|
| `mi-postgres` | postgres:16-alpine | `5432` | La base de datos PostgreSQL |
| `mi-pgadmin` | dpage/pgadmin4:latest | `8080` | Interfaz visual (web) para administrar Postgres |
| `mi-postgres-mcp` | crystaldba/postgres-mcp:latest | `8000` | Servidor MCP para que el IDE/Claude consulte la DB |

### Credenciales

```text
Postgres:
  Host (desde Windows):  localhost
  Host (desde otro container en la misma red docker): mi-postgres
  Puerto:                5432
  Usuario:               admin
  Password:              ingsoft1
  Base de datos:         mi_base_de_datos

pgAdmin:
  URL:       http://localhost:8080
  Email:     lyuman737@gmail.com
  Password:  ingsoft1!
```

---

## 2. Comandos básicos de Docker

### Ver qué contenedores están corriendo

```powershell
docker ps
```

Salida útil (formato corto):

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Ver TODOS los contenedores (incluyendo los detenidos)

```powershell
docker ps -a
```

### Iniciar / detener / reiniciar un contenedor

```powershell
docker start  mi-postgres
docker stop   mi-postgres
docker restart mi-postgres
```

### Ver logs

```powershell
# Últimas 50 líneas
docker logs --tail 50 mi-postgres

# Seguir en tiempo real (Ctrl+C para salir)
docker logs -f mi-postgres
```

### Inspeccionar configuración (red, env, volúmenes)

```powershell
docker inspect mi-postgres
```

Filtrar campos específicos:

```powershell
docker inspect mi-postgres --format '{{json .Config.Env}}'
docker inspect mi-postgres --format '{{json .NetworkSettings.Networks}}'
```

---

## 3. Conectarse a Postgres desde la terminal

### Opción A — Una query rápida (sin entrar interactivo)

```powershell
docker exec mi-postgres psql -U admin -d mi_base_de_datos -c "SELECT version();"
```

> `docker exec` corre un comando dentro del contenedor. `-c` ejecuta una sola query y sale.

### Opción B — Shell interactiva de psql

```powershell
docker exec -it mi-postgres psql -U admin -d mi_base_de_datos
```

Te queda un prompt `mi_base_de_datos=#`. Para salir: `\q` + Enter.

> El flag `-it` te da terminal interactiva. **Sin `-it`** los comandos `\d`, `\dt`, etc. también funcionan con `-c`, pero la entrada del teclado no.

---

## 4. Inspeccionar el schema con psql

Dentro del prompt de psql (o pasando con `-c "<comando>"`):

### Listar todas las tablas

```sql
\dt
```

Salida actual del proyecto:

```text
                 List of relations
 Schema |           Name            | Type
--------+---------------------------+-------
 public | _prisma_migrations        | table
 public | audit_logs                | table
 public | bank_accounts             | table
 public | blocks                    | table
 public | cash_sessions             | table
 public | client_gestors            | table
 public | client_occupations        | table
 public | clients                   | table
 public | contract_lots             | table
 public | contracts                 | table
 public | down_payment_installments | table
 public | gestors                   | table
 public | lots                      | table
 public | payment_applications      | table
 public | payment_schedules         | table
 public | payments                  | table
 public | projects                  | table
 public | users                     | table
```

### Describir una tabla (columnas, tipos, índices, FKs)

```sql
\d lots
```

### Listar enums

```sql
\dT+
```

O con SQL:

```sql
SELECT n.nspname, t.typname
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE t.typtype = 'e' AND n.nspname = 'public'
ORDER BY t.typname;
```

### Ver valores de un enum específico

```sql
SELECT unnest(enum_range(NULL::"LotStatus"));
```

### Listar índices de una tabla

```sql
\di lots*
```

### Otros comandos útiles de psql

| Comando | Qué hace |
|---|---|
| `\l` | Lista todas las bases de datos |
| `\c <db>` | Conectarse a otra DB |
| `\du` | Lista usuarios/roles |
| `\dn` | Lista schemas |
| `\df` | Lista funciones |
| `\dv` | Lista vistas |
| `\dx` | Lista extensiones instaladas |
| `\timing on` | Muestra cuánto tarda cada query |
| `\x` | Activa/desactiva formato vertical (útil para tablas anchas) |
| `\?` | Ayuda de comandos `\` |
| `\h` | Ayuda de sintaxis SQL |
| `\q` | Salir |

---

## 5. Queries útiles para este proyecto

> **IMPORTANTE**: las columnas están en **camelCase** (`lotNumber`, `blockId`, `basePrice`, …), por lo que en SQL crudo hay que envolverlas en comillas dobles: `"lotNumber"`. Los nombres de tabla sí están en snake_case y no requieren comillas.

### Conteo rápido por tabla (verificar seed)

```sql
SELECT 'users' AS t, COUNT(*) FROM users
UNION ALL SELECT 'projects',      COUNT(*) FROM projects
UNION ALL SELECT 'blocks',        COUNT(*) FROM blocks
UNION ALL SELECT 'lots',          COUNT(*) FROM lots
UNION ALL SELECT 'clients',       COUNT(*) FROM clients
UNION ALL SELECT 'bank_accounts', COUNT(*) FROM bank_accounts
ORDER BY t;
```

### Lotes con proyecto y manzana (join)

```sql
SELECT
  p.name           AS proyecto,
  b.name           AS manzana,
  l."lotNumber"    AS lote,
  l.area,
  l."basePrice"    AS precio,
  l.status,
  l."isCorner"     AS esquinero
FROM lots l
JOIN blocks   b ON l."blockId"   = b.id
JOIN projects p ON b."projectId" = p.id
WHERE l."deletedAt" IS NULL
ORDER BY p.name, b.name, l."lotNumber";
```

### Verificar el usuario admin (sin exponer el hash completo)

```sql
SELECT
  username,
  email,
  "fullName",
  role,
  "isActive",
  LEFT(password, 7) AS bcrypt_prefix,   -- debe ser "$2a$12$"
  LENGTH(password)  AS hash_length      -- debe ser 60
FROM users;
```

### Lotes disponibles vs vendidos

```sql
SELECT status, COUNT(*) FROM lots WHERE "deletedAt" IS NULL GROUP BY status;
```

### Lotes liberados de algún contrato (cuando ya haya contratos)

```sql
SELECT cl.*
FROM contract_lots cl
WHERE cl."releasedAt" IS NOT NULL;
```

### Estado de las migraciones aplicadas

```sql
SELECT migration_name, started_at, finished_at, applied_steps_count
FROM _prisma_migrations
ORDER BY started_at DESC;
```

---

## 6. Inspeccionar con pgAdmin (interfaz web)

Si prefieres un cliente visual:

1. Abrir `http://localhost:8080` en el navegador.
2. Login: `lyuman737@gmail.com` / `ingsoft1!`.
3. **Add New Server** (clic derecho sobre "Servers" → Register → Server):
   - **General → Name:** `mi-postgres` (o el nombre que quieras)
   - **Connection → Host name/address:** `mi-postgres` (pgAdmin lo resuelve si están en la misma red de docker) o, si falla, `host.docker.internal`
   - **Connection → Port:** `5432`
   - **Connection → Maintenance database:** `mi_base_de_datos`
   - **Connection → Username:** `admin`
   - **Connection → Password:** `ingsoft1` (marca "Save password" para no repetirlo)
4. Click **Save**. El servidor aparece en el panel izquierdo.
5. Navegar: `Servers → mi-postgres → Databases → mi_base_de_datos → Schemas → public → Tables`.
6. Botón derecho en una tabla → **View/Edit Data → All Rows**.
7. Para queries libres: botón **Query Tool** (ícono de consola) en la barra superior.

### Si pgAdmin no se conecta a `mi-postgres`

Revisar que ambos contenedores compartan red:

```powershell
docker inspect mi-pgadmin   --format '{{json .NetworkSettings.Networks}}'
docker inspect mi-postgres  --format '{{json .NetworkSettings.Networks}}'
```

Si están en redes distintas, conectarlos:

```powershell
docker network ls
docker network connect mi-postgres-proyecto_db_network mi-pgadmin
```

(El nombre exacto de la red depende del compose que la creó — sale en el `docker inspect`.)

---

## 7. Volcados y respaldos

### Exportar toda la base a un archivo SQL

```powershell
docker exec mi-postgres pg_dump -U admin -d mi_base_de_datos > backup.sql
```

### Sólo el schema (sin datos)

```powershell
docker exec mi-postgres pg_dump -U admin -d mi_base_de_datos --schema-only > schema.sql
```

### Sólo datos (sin schema)

```powershell
docker exec mi-postgres pg_dump -U admin -d mi_base_de_datos --data-only > data.sql
```

### Restaurar desde un archivo

```powershell
docker exec -i mi-postgres psql -U admin -d mi_base_de_datos < backup.sql
```

> El flag `-i` es importante para que el shell pueda redirigir el archivo como STDIN dentro del contenedor.

---

## 8. Borrar todo y empezar de cero

> ⚠️ **Destructivo**: elimina los datos.

### Vaciar la DB sin tocar el contenedor

Desde el backend (mucho más rápido que recrear el container):

```powershell
cd backend
pnpm exec prisma migrate reset
```

Esto:
1. Hace `DROP DATABASE` + `CREATE DATABASE`
2. Re-aplica todas las migraciones desde cero
3. Re-ejecuta el seed (`pnpm db:seed`)

### Reiniciar el contenedor desde cero (pierde el volumen)

```powershell
docker stop mi-postgres
docker rm   mi-postgres
docker volume ls                 # buscar el volumen asociado
docker volume rm <nombre_volumen>
# luego volver a levantar con docker compose up -d o docker run ...
```

---

## 9. Workflow típico de desarrollo

```powershell
# 1. Verificar que el container está corriendo
docker ps --filter name=mi-postgres

# 2. Arrancar el backend (desde Windows, no en docker)
cd backend
pnpm dev

# 3. En otra terminal, inspeccionar mientras el backend corre
docker exec -it mi-postgres psql -U admin -d mi_base_de_datos

# Dentro del prompt:
\dt                                              # ver tablas
SELECT * FROM users;                             # ver datos
\q                                               # salir

# 4. Si modificas el schema.prisma:
cd backend
pnpm exec prisma migrate dev --name <nombre_descriptivo>

# 5. Si quieres explorar la DB con UI:
pnpm db:studio                                   # abre Prisma Studio en http://localhost:5555
# o usar pgAdmin en http://localhost:8080
```

---

## 10. Resolución de problemas comunes

### "could not connect to server: Connection refused"

El container probablemente no está corriendo:

```powershell
docker ps -a --filter name=mi-postgres
docker start mi-postgres
docker logs --tail 30 mi-postgres
```

### "password authentication failed for user admin"

Verificar la contraseña real configurada en el container:

```powershell
docker inspect mi-postgres --format '{{json .Config.Env}}'
```

Buscar `POSTGRES_PASSWORD=…`. Ese es el valor real, no el de un archivo `.env` cualquiera.

### "FATAL: database does not exist"

Listar bases existentes:

```powershell
docker exec mi-postgres psql -U admin -l
```

Crear si falta:

```powershell
docker exec mi-postgres psql -U admin -c "CREATE DATABASE mi_base_de_datos;"
```

### Prisma se queja con "Environment variable not found: DATABASE_URL"

`backend/.env` no existe o no está accesible. Crearlo a partir de `.env.example`:

```powershell
cd backend
copy ..\.env.example .env       # luego editar valores
```

O exportar inline una sola vez:

```powershell
$env:DATABASE_URL="postgresql://admin:ingsoft1@localhost:5432/mi_base_de_datos"
pnpm exec prisma migrate status
```

### `docker exec` falla con "exec: \"psql\": executable file not found"

Estás apuntando al container equivocado (pgadmin o mcp no tienen psql). Confirmar el nombre:

```powershell
docker ps --format "{{.Names}}"
```

Debe ser **`mi-postgres`** para queries SQL.

### pgAdmin no ve `mi-postgres` cuando uso ese nombre como host

Los dos containers no están en la misma red docker. Soluciones:

- **Rápido**: usar `host.docker.internal` como host en pgAdmin.
- **Limpio**: conectar pgAdmin a la red de postgres con `docker network connect`.

---

## 11. Referencia rápida

```powershell
# Estado
docker ps                                                                    # qué corre
docker logs --tail 50 mi-postgres                                            # logs
docker stats --no-stream                                                     # uso CPU/RAM

# Acceso
docker exec -it mi-postgres psql -U admin -d mi_base_de_datos                # shell SQL interactiva
docker exec mi-postgres psql -U admin -d mi_base_de_datos -c "QUERY"         # query única

# Inspección
\dt                          # tablas
\d <tabla>                   # describir tabla
\dT+                         # enums
\di                          # índices
\du                          # usuarios

# Migración
pnpm exec prisma migrate status                                              # estado
pnpm exec prisma migrate dev --name <name>                                   # crear+aplicar
pnpm exec prisma migrate reset                                               # destruir+recrear
pnpm db:seed                                                                 # poblar

# Backup
docker exec mi-postgres pg_dump -U admin -d mi_base_de_datos > backup.sql    # exportar
docker exec -i mi-postgres psql -U admin -d mi_base_de_datos < backup.sql    # importar
```
