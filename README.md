# GestionLotes

Sistema de administración total para una empresa lotificadora — gestión de proyectos, manzanas, lotes, clientes, contratos, calendario de pagos, cuadre de caja y usuarios con control de acceso por roles.

---

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Node.js 20 + Express + TypeScript |
| ORM | Prisma (PostgreSQL) |
| Frontend | React 18 + Vite + TypeScript |
| Producción frontend | Nginx (SPA) |
| Package manager | pnpm 9 |
| DB local | PostgreSQL 16 (Docker Compose) |
| DB producción | PostgreSQL gestionado en Railway |
| Deploy | Railway (un servicio por carpeta) |

---

## Requisitos previos

- Node.js >= 20
- pnpm >= 9 (`corepack enable && corepack prepare pnpm@9.1.0 --activate`)
- Docker Desktop (para desarrollo local)
- Git

---

## Setup local

```bash
# 1. Clonar
git clone <repo-url>
cd GestionLotes-main

# 2. Variables de entorno
cp .env.example .env
# Editar .env y poner JWT_SECRET / JWT_REFRESH_SECRET (≥16 caracteres c/u)

# 3. Generar lockfiles (sólo la primera vez, fuera de Docker)
cd backend  && pnpm install && cd ..
cd frontend && pnpm install && cd ..

# 4. Levantar todo (db + backend + frontend)
docker compose up -d

# 5. Aplicar migraciones (genera el client y crea las tablas)
docker compose exec backend pnpm exec prisma migrate dev --name init

# 6. Poblar datos de prueba
docker compose exec backend pnpm db:seed
```

Servicios:

- **Backend:** http://localhost:4000 (health: `/health`)
- **Frontend:** http://localhost:5173
- **PostgreSQL:** localhost:5432
- **Prisma Studio (opcional):** `docker compose exec backend pnpm db:studio`

Credenciales de admin sembradas: `admin / admin123` ← **cambiar antes de pasar a producción.**

---

## Comandos útiles

```bash
# Logs
docker compose logs -f backend
docker compose logs -f frontend

# Reiniciar un servicio
docker compose restart backend

# Detener y borrar datos
docker compose down -v

# Prisma desde dentro del container
docker compose exec backend pnpm exec prisma migrate dev
docker compose exec backend pnpm exec prisma generate
docker compose exec backend pnpm db:studio

# Linter
docker compose exec backend pnpm lint
```

---

## Estructura del monorepo

```
GestionLotes-main/
├── docker-compose.yml
├── .env.example
├── README.md                        # Este archivo
├── STATE.md                         # Estado al cierre de Fase 1 (legacy)
├── RAILWAY-DOCKER-WORKFLOW.md       # Referencia del flujo de deployment
│
├── docs/                            # Documentación interna
│   ├── API.md                       # Endpoints REST
│   └── STATE.md                     # Estado actual (Fase 2)
│
├── backend/                         # API Express + Prisma
│   ├── Dockerfile
│   ├── railway.toml
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── schemas/                 # Schema modular por dominio
│   │   └── seeds/seed.ts
│   └── src/
│       ├── main.ts                  # Entry point
│       ├── app.ts                   # Config Express
│       ├── config/                  # env, cors, database
│       ├── lib/                     # prisma, jwt, bcrypt, pdf
│       ├── utils/                   # apiError, asyncHandler, calculations, formatters
│       ├── middleware/              # errorHandler, auth, rbac, validate, logger
│       ├── routes/                  # health + router principal
│       └── modules/                 # Módulos de negocio (un dominio por carpeta)
│           ├── auth/
│           ├── projects/
│           ├── clients/
│           ├── contracts/
│           ├── payments/
│           ├── cash/
│           ├── users/
│           └── common/
│
└── frontend/                        # SPA React + Vite
    ├── Dockerfile
    ├── railway.toml
    ├── nginx.conf
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx
        └── services/api.ts
```

---

## Variables de entorno

### Backend (`backend/.env` o `docker-compose.yml`)

| Variable | Requerida | Default | Descripción |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | Connection string PostgreSQL |
| `JWT_SECRET` | ✅ | — | Secreto access token (≥16 chars) |
| `JWT_REFRESH_SECRET` | ✅ | — | Secreto refresh token (≥16 chars) |
| `JWT_EXPIRES_IN` | — | `15m` | Duración del access token |
| `JWT_REFRESH_EXPIRES_IN` | — | `7d` | Duración del refresh token |
| `PORT` | — | `4000` | Puerto del backend |
| `NODE_ENV` | — | `development` | `development` / `test` / `production` |
| `FRONTEND_URL` | — | `http://localhost:5173` | Origen permitido para CORS |
| `BCRYPT_SALT_ROUNDS` | — | `12` | Mínimo 10 |
| `LOGIN_RATE_LIMIT` | — | `10` | Intentos por minuto por IP |

### Frontend (`frontend/.env`)

| Variable | Default | Descripción |
|---|---|---|
| `VITE_API_URL` | `http://localhost:4000` | Base URL del backend |

> Si alguna variable backend requerida falta o tiene formato inválido, el proceso termina al arrancar con el detalle del error (fail-fast vía Zod en `config/env.ts`).

---

## Documentación interna

- 📘 [**docs/API.md**](docs/API.md) — referencia de todos los endpoints REST.
- 📊 [**docs/STATE.md**](docs/STATE.md) — estado actual del proyecto, decisiones de arquitectura y pendientes.
- 🐳 [**docs/DOCKER-DB-GUIDE.md**](docs/DOCKER-DB-GUIDE.md) — cómo usar Docker e inspeccionar la base de datos (psql, pgAdmin, backups, troubleshooting).
- 🚂 [**RAILWAY-DOCKER-WORKFLOW.md**](RAILWAY-DOCKER-WORKFLOW.md) — flujo de deployment a Railway.

### Skills para Claude Code

- 🤖 [**.claude/skills/gestionlotes-db**](.claude/skills/gestionlotes-db/SKILL.md) — guía obligatoria para cualquier modificación a la base de datos. Lee esto (o pídele a Claude que lo siga) antes de tocar `prisma/schemas/*.prisma`. Previene drift entre la DB local y lo que Railway replicará a futuro.

---

## Notas de seguridad

- Passwords hasheados con bcrypt (salt rounds ≥ 12).
- JWT con expiración corta (15 min) + refresh token (7 días).
- Rate limit en `POST /api/auth/login` (10/min/IP).
- Soft delete en `Client`, `Contract`, `User`, `Lot` para preservar referencias históricas.
- `AuditLog` para acciones críticas (contratos, pagos, cierres de caja).
- Todos los cálculos monetarios usan `Decimal` — nunca `number` nativo.

---

## Roles

| Rol | Permisos |
|---|---|
| `ADMIN` | Acceso total |
| `OWNER` | Acceso total (distinción para reportes) |
| `COLLECTOR` | Registrar pagos, abrir/cerrar caja, consultar contratos |
| `VIEWER` | Sólo lectura |
