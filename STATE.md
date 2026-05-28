# Estado Actual del Proyecto — GestionLotes

> Generado al finalizar la implementación de la estructura base.
> Usar como contexto de entrada en conversaciones futuras.

---

## Stack definido

| Capa | Tecnología |
|---|---|
| Backend | Node.js 20 + Express + TypeScript |
| ORM | Prisma (PostgreSQL) |
| Frontend | React 18 + Vite + TypeScript |
| Producción frontend | Nginx (SPA) |
| Package manager | **pnpm 9** (ambos servicios) |
| Base de datos local | PostgreSQL 16-alpine vía Docker Compose |
| Base de datos prod | PostgreSQL en Railway (servicio gestionado) |
| Deploy | Railway (monorepo, un servicio por carpeta) |

---

## Estructura de archivos creados

```
GestionLotes-main/
├── docker-compose.yml          # Orquestación local (db + backend + frontend)
├── .env.example                # Plantilla de variables (commiteable)
├── .gitignore
├── .dockerignore
├── RAILWAY-DOCKER-WORKFLOW.md  # Documento de referencia del flujo
├── STATE.md                    # Este archivo
│
├── backend/
│   ├── Dockerfile              # Multi-stage: builder / development / production
│   ├── railway.toml            # Config Railway: DOCKERFILE, healthcheck /health, pre-deploy migrate
│   ├── .dockerignore
│   ├── package.json            # Express, Prisma, bcryptjs, jsonwebtoken, zod, cors, dotenv
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma       # VACÍO — pendiente de contexto del sistema
│   └── src/
│       ├── main.ts             # Entry point: conecta DB, escucha en 0.0.0.0:PORT
│       ├── app.ts              # Express: cors, json, routers, errorHandler
│       ├── lib/
│       │   └── prisma.ts       # Singleton PrismaClient
│       ├── middleware/
│       │   └── errorHandler.ts # Middleware de errores centralizado
│       └── routes/
│           └── health.ts       # GET /health → { status, db, timestamp }
│
└── frontend/
    ├── Dockerfile              # Multi-stage: builder / development / production (nginx)
    ├── railway.toml            # Config Railway: DOCKERFILE, healthcheck /
    ├── nginx.conf              # SPA fallback + proxy /api/ → backend:4000
    ├── .dockerignore
    ├── package.json            # React, react-router-dom, axios, vite
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts          # host 0.0.0.0, proxy /api → VITE_API_URL
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx             # BrowserRouter con ruta / placeholder
        └── services/
            └── api.ts          # Axios con interceptor de token JWT y redirect 401
```

---

## Comportamiento local (Docker Compose)

```bash
# Copiar variables
cp .env.example .env

# Levantar todo
docker compose up -d

# Ver logs del backend
docker compose logs -f backend

# Correr migraciones (cuando el schema esté listo)
docker compose exec backend pnpm exec prisma migrate dev

# Detener y borrar datos
docker compose down -v
```

- DB escucha en `localhost:5432`
- Backend en `http://localhost:4000`
- Frontend en `http://localhost:5173`
- Health check: `GET http://localhost:4000/health`

---

## Comportamiento en Railway (producción)

Cada carpeta (`backend/`, `frontend/`) es un **Railway Service** independiente dentro del mismo proyecto.

| Servicio | Root Directory | Pre-deploy |
|---|---|---|
| backend | `backend/` | `pnpm exec prisma migrate deploy` |
| frontend | `frontend/` | — |
| db | Railway managed PostgreSQL | — |

Railway inyecta `DATABASE_URL` automáticamente al backend desde el servicio de DB del mismo proyecto.

---

## pnpm — notas importantes

- Los Dockerfiles usan `corepack enable` para activar pnpm sin instalarlo manualmente.
- Se requiere `pnpm-lock.yaml` en cada carpeta (`backend/` y `frontend/`) antes del primer build.
- Para generar los lockfiles localmente (sin Docker): `pnpm install` en cada carpeta.
- Los volúmenes anónimos en Docker Compose excluyen `node_modules` y `.pnpm-store` del bind mount.

---

## Pendiente (requiere contexto del sistema)

- **pnpm-lock.yaml**: generar con `pnpm install` en `backend/` y `frontend/` antes del primer `docker compose up`
- **schema.prisma**: modelos de negocio — esperando definición del dominio
- **Rutas de negocio**: controllers, services, routers — esperando definición
- **Páginas del frontend**: componentes, navegación — esperando definición
- **Autenticación**: middleware JWT, login/registro — esperando decisión de roles

---

## Variables de entorno necesarias

| Variable | Dónde | Descripción |
|---|---|---|
| `DATABASE_URL` | backend | Connection string PostgreSQL |
| `JWT_SECRET` | backend | Secreto para firmar tokens |
| `PORT` | backend | Puerto (Railway lo asigna; default 4000) |
| `NODE_ENV` | backend | `development` o `production` |
| `VITE_API_URL` | frontend (build) | URL del backend para el cliente |
| `FRONTEND_URL` | backend | URL del frontend para CORS |
