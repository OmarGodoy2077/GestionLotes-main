# Flujo de Trabajo: Docker + Railway (Full Stack)

> Documento técnico basado en la documentación oficial de Railway (docs.railway.com),
> la referencia de Railpack (railpack.com), y las prácticas de despliegue
> profesional con Docker Compose + Railway.

---

## Índice

1. [Arquitectura General](#1-arquitectura-general)
2. [Flujo Local con Docker Compose](#2-flujo-local-con-docker-compose)
3. [Base de Datos](#3-base-de-datos)
4. [Backend (API)](#4-backend-api)
5. [Frontend](#5-frontend)
6. [Railway Internals](#6-railway-internals)
7. [Versionado y Despliegue (Git + Railway)](#7-versionado-y-despliegue-git--railway)
8. [Workflow Completo](#8-workflow-completo)
9. [Railway CLI: railway dev](#9-railway-cli-railway-dev)
10. [Consideraciones y Límites](#10-consideraciones-y-límites)

---

## 1. Arquitectura General

Railway es una plataforma PaaS (Platform as a Service). No ejecuta
`docker-compose.yml` directamente. Cada servicio definido en tu Compose
se mapea a un **Railway Service** independiente dentro de un **Railway Project**.

### Equivalencias Docker Compose → Railway

| Docker Compose | Railway |
|---|---|
| `services:` entry | Railway Service |
| `build:` (Dockerfile) | GitHub Repo + Dockerfile |
| `image:` (imagen pública) | Deploy desde Docker Image |
| `ports:` | Public Networking (externo) o Private Networking (interno) |
| `volumes:` | Railway Volumes (persistencia) |
| `networks:` | Automatic Private Networking (sin configuración) |
| `environment:` / `env_file:` | Railway Variables |
| `depends_on:` | No tiene equivalente directo. La app debe manejar reintentos de conexión. |

### Proyecto de ejemplo

```
mi-proyecto/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── docker-compose.yml    # Desarrollo local
└── .env                  # Variables locales (no se sube a git)
```

En Railway, este proyecto se representa como un **Project** con tres
**Services**: `backend`, `frontend`, y una base de datos (PostgreSQL/MySQL/Redis).

---

## 2. Flujo Local con Docker Compose

### docker-compose.yml

```yaml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-app}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-app}
      POSTGRES_DB: ${DB_NAME:-app}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-app}"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: development
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgresql://${DB_USER:-app}:${DB_PASSWORD:-app}@db:5432/${DB_NAME:-app}
      JWT_SECRET: ${JWT_SECRET}
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: development
    restart: unless-stopped
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:4000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

volumes:
  pgdata:
```

### .env (local, excluido de git)

```env
DB_USER=app
DB_PASSWORD=app
DB_NAME=app
JWT_SECRET=dev-secret-no-usar-en-prod
```

### Comandos diarios

```bash
# Iniciar todo
docker compose up -d

# Ver logs de un servicio
docker compose logs -f backend

# Reconstruir sin cache
docker compose build --no-cache backend

# Ejecutar migraciones local
docker compose exec backend npx prisma migrate dev

# Detener y limpiar volúmenes
docker compose down -v
```

### Puntos críticos del desarrollo local

| Aspecto | Práctica recomendada |
|---|---|
| Hot-reload | Montar código como volumen (`./backend:/app`) y excluir `node_modules` con un volumen anónimo (`/app/node_modules`) |
| Base de datos | Usar `healthcheck` para que backend espere a que DB esté lista |
| Variables | Nunca commitear `.env`. Usar `.env.example` como plantilla |
| Puerto backend | Railway requiere que el backend escuche en `0.0.0.0`, no `localhost`. Asegurarlo en el código. |

---

## 3. Base de Datos

### Local (Docker Compose)

Se define como un servicio más en `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-app}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-app}
      POSTGRES_DB: ${DB_NAME:-app}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
```

- **Volumen**: `pgdata` persiste datos entre reinicios.
- **Puerto**: se mapea a `localhost:5432` para que herramientas externas (DBeaver, TablePlus) puedan conectar.
- **Reset**: `docker compose down -v` borra el volumen y los datos.

### Railway (Producción)

Railway ofrece **bases de datos gestionadas** con un clic:

- PostgreSQL
- MySQL
- Redis
- MongoDB

Para agregarla:

1. En el dashboard de Railway, click **New** → **Database** → elegir tipo.
2. Railway provisiona la base y expone automáticamente variables de entorno:
   - `DATABASE_URL` (connection string completa)
   - `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` (para PostgreSQL)

### Conectar backend a Railway DB

Railway asigna la variable `DATABASE_URL` automáticamente al servicio. En tu backend solo necesitas:

```js
// Ejemplo con Prisma
const DATABASE_URL = process.env.DATABASE_URL;
```

No necesitas configuración especial. Railway inyecta la variable en cada servicio del mismo proyecto.

### Migraciones

**Local**:

```bash
docker compose exec backend npx prisma migrate dev
```

**Railway**:

Se ejecutan con el **Pre-Deploy Command** en la configuración del servicio:

```
npx prisma migrate deploy
```

Railway ejecuta este comando **después** del build pero **antes** de que el nuevo deployment reciba tráfico. Si falla, el deployment se cancela y el anterior sigue activo.

### Connection Pooling

Railway PostgreSQL **no incluye connection pooling por defecto**. Para producción con muchas conexiones concurrentes, considera:

- Usar PgBouncer (contenedor aparte)
- Usar el TCP proxy de Railway
- Limitar el pool en tu ORM (Prisma: `connection_limit`)

---

## 4. Backend (API)

### Dockerfile (multi-etapa)

```dockerfile
# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Development Stage ----
FROM builder AS development

RUN npm install --include=dev
CMD ["npm", "run", "dev"]

# ---- Production Stage ----
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node dist/healthcheck.js || exit 1

CMD ["node", "dist/main.js"]
```

### Puntos clave del Dockerfile

| Elemento | Razón |
|---|---|
| `node:20-alpine` | Imagen liviana (~5MB vs ~900MB de node full) |
| Multi-stage | Build separado de producción, imagen final más chica y segura |
| `npm ci` | Instalación determinística (usa `package-lock.json`) |
| `--only=production` | No incluye devDependencies en producción |
| `USER nodejs` | Nunca correr como root en producción |
| `HEALTHCHECK` | Railway lo usa para saber si el servicio está vivo. Sin healthcheck, Railway asume que el proceso inició correctamente. |
| `EXPOSE` | Es **documentativo** en Railway. Railway detecta el puerto automáticamente o se configura con `RAILWAY_PORT`. |

### Healthcheck

Railway espera que el healthcheck responda HTTP 200 para marcar el deployment como **Active**.

Ejemplo mínimo (`src/healthcheck.ts`):

```ts
import http from "http";

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("OK");
});

server.listen(4000);
```

### Variables de entorno (Railway)

En Railway Dashboard → Service → Variables, se definen:

| Variable | Valor | Nota |
|---|---|---|
| `DATABASE_URL` | *(auto)* | Inyectada por Railway si hay DB en el proyecto |
| `JWT_SECRET` | *(manual)* | Secreta, nunca en git |
| `RAILWAY_PORT` | `4000` | Railway asigna `PORT` automáticamente si no se configura |
| `NODE_ENV` | `production` | |

### railway.toml (Config as Code)

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
numReplicas = 1
restartPolicyType = "on_failure"
healthcheckPath = "/health"
healthcheckTimeout = 5
startCommand = "node dist/main.js"

[deploy.preDeployCommand]
command = "npx prisma migrate deploy"
```

También en JSON (`railway.json`):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "on_failure",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 5,
    "startCommand": "node dist/main.js",
    "preDeployCommand": "npx prisma migrate deploy"
  }
}
```

---

## 5. Frontend

Hay dos enfoques según el tipo de frontend.

### Opción A: SPA (React/Vite/Angular) — Static + Nginx

```dockerfile
# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf**:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:4000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Nota**: Railway usa **Private Networking** automático. El frontend puede referirse al backend por su nombre de servicio (`backend` en este caso) gracias a la red interna de Railway. No necesitas exponer el backend públicamente.

### Opción B: SSR (Next.js/Nuxt/SvelteKit)

```dockerfile
# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS production

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000',r=>process.exit(r.statusCode===200?0:1))"

CMD ["npm", "start"]
```

### Railway config para frontend

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/"
healthcheckTimeout = 5
```

### CORS

Como frontend y backend son servicios separados en Railway, cada uno tiene su propia URL. El backend debe configurar CORS para aceptar peticiones desde el dominio del frontend.

```ts
// Express
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
```

---

## 6. Railway Internals

### Railpack (build automático)

Railway usa **Railpack** como sistema de build por defecto. Detecta automáticamente:

- Lenguaje (Node, Python, Go, Rust, Java, Ruby, PHP, .NET, etc.)
- Framework
- Comandos de build y start

**Ventaja**: cero configuración para proyectos estándar.
**Desventaja**: menos control. Si necesitas personalización avanzada, usa Dockerfile explícito.

Si tu proyecto tiene un `Dockerfile` en la raíz, Railway **prioriza el Dockerfile** sobre Railpack.

Para forzar Dockerfile explícitamente:

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"
```

### Railpack config file (`railpack.toml`)

```toml
[config]
nodeVersion = "20"

[start]
cmd = "node dist/main.js"

[install]
apt = ["curl", "jq"]
```

### Private Networking

Railway asigna automáticamente un nombre DNS interno a cada servicio.
Dentro de la misma red del proyecto, los servicios se comunican por nombre:

- `backend:4000` desde el frontend
- `db:5432` desde el backend

No necesitas exponer puertos para comunicación interna. Solo se necesita
`ports` en Compose local; en Railway la red privada es automática.

### GitHub Autodeploys

Cuando conectás un repositorio de GitHub a un Railway Service:

1. Hacés push a la rama configurada (ej: `main`)
2. Railway recibe el webhook de GitHub
3. Railway clona el repo (o el subdirectorio si hay Root Directory)
4. Ejecuta el build (Railpack o Dockerfile)
5. Si el build falla → notificación de error, no hay deploy
6. Si el build pasa → ejecuta Pre-Deploy Command (migraciones)
7. Si el pre-deploy falla → deploy cancelado, el anterior sigue activo
8. Si pasa → inicia el contenedor, espera healthcheck
9. Healthcheck OK → deployment **Active**, recibe tráfico
10. Healthcheck falla → deployment **Crashed**, Railway reintenta hasta 10 veces

### Staged Changes

Los cambios se pueden **stagear** (preparar) antes de desplegar.
Podés revisar qué cambió entre el deployment actual y el nuevo antes de
confirmar el deploy. Esto aplica tanto a variables como a configuraciones.

### Watch Paths (Monorepo)

```toml
[build]
watchPatterns = ["backend/**", "packages/shared/**"]
```

Solo cambios en esos paths gatillan un nuevo deployment. Ideal para monorepos.

---

## 7. Versionado y Despliegue (Git + Railway)

### Estrategia de ramas

```
main               → Producción (Railway production environment)
├── develop        → Staging (Railway preview environment)
│   ├── feature/auth  → PR environment efímero
│   ├── feature/ui    → PR environment efímero
│   └── fix/header    → PR environment efímero
```

### Railway Environments

Railway soporta **múltiples entornos** dentro de un proyecto:

- **Production**: el entorno principal, conectado a `main`
- **Preview**: entornos efímeros que se crean automáticamente por PR
- **Static**: entornos fijos adicionales (ej: `staging`)

Cada entorno tiene sus propias variables y servicios.

### PR Environments (automático)

Cuando abrís un Pull Request en GitHub, Railway puede crear automáticamente
un entorno **Preview** efímero:

1. Abrís PR de `feature/auth` contra `main`
2. Railway detecta el PR y despliega el branch en un entorno temporal
3. Railway te da una URL única: `feature-auth.up.railway.app`
4. Podés testear con datos reales (o una copia de la DB)
5. Cuando cerrás el PR, Railway destruye el entorno

Para habilitarlo: Project → Settings → Enable PR Previews.

### Flujo de despliegue típico

```bash
git checkout -b feature/registro
# ... trabajar, commitear ...
git push origin feature/registro
# Crear PR en GitHub
# Railway despliega preview automáticamente
# Testear en la URL de preview
# Merge PR a main
# Railway despliega a producción automáticamente
```

### Rollback

En Railway Dashboard → Deployment → redeploy previous version.
También desde CLI:

```bash
railway redeploy <deployment-id>
```

---

## 8. Workflow Completo

### De punta a punta

```
┌─────────────────────────────────────────────────────────┐
│                     DESARROLLO LOCAL                     │
├─────────────────────────────────────────────────────────┤
│ 1. git pull (últimos cambios)                            │
│ 2. docker compose up -d (levanta todo)                   │
│ 3. docker compose exec backend npm run migrate:dev       │
│ 4. Code, code, code (hot-reload con volúmenes)           │
│ 5. docker compose down (al terminar)                     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                       GIT PUSH                           │
├─────────────────────────────────────────────────────────┤
│ 6. git add -A                                            │
│ 7. git commit -m "feat: registro de usuarios"            │
│ 8. git push origin feature/registro                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  RAILWAY (PR PREVIEW)                    │
├─────────────────────────────────────────────────────────┤
│ 9. Railway detecta el nuevo branch                       │
│ 10. Railway clona el repo (subdirectorio si aplica)      │
│ 11. Build: Railpack o Dockerfile                         │
│ 12. DB: provisiona base temporal (opcional)              │
│ 13. Pre-deploy: ejecuta migraciones                      │
│ 14. Healthcheck: espera que responda                     │
│ 15. URL: feature-registro.up.railway.app                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    CODE REVIEW + MERGE                   │
├─────────────────────────────────────────────────────────┤
│ 16. Testear en URL de preview                            │
│ 17. Code review en GitHub                                │
│ 18. Merge PR a main                                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                RAILWAY (PRODUCCIÓN)                      │
├─────────────────────────────────────────────────────────┤
│ 19. Railway detecta push a main                          │
│ 20. Build image                                          │
│ 21. Pre-deploy: npx prisma migrate deploy                │
│ 22. Deploy nuevo contenedor                              │
│ 23. Healthcheck → Active                                 │
│ 24. Viejo contenedor recibe señal de terminar (SIGTERM)  │
│ 25. Nuevo deployment recibe tráfico                      │
└─────────────────────────────────────────────────────────┘
```

### Estados de un Deployment en Railway

| Estado | Significado |
|---|---|
| `Initializing` | Creado, esperando entrar a cola de build |
| `Building` | Railway está construyendo la imagen Docker |
| `Deploying` | Build OK, iniciando contenedor |
| `Active` | Corriendo correctamente (healthcheck pasó) |
| `Crashed` | Proceso terminó con código no-cero. Railway reintenta hasta 10 veces. |
| `Removed` | Deployment eliminado (cleanup) |

---

## 9. Railway CLI: railway dev

Railway provee un comando `railway dev` (experimental) que genera automáticamente
un `docker-compose.yml` a partir de la configuración de tu proyecto en Railway.

### Cómo funciona

```bash
# Instalar CLI
npm install -g @railway/cli

# Login
railway login

# Link al proyecto
railway link

# Iniciar desarrollo local con los mismos servicios que en Railway
railway dev
```

Esto:

1. Obtiene la configuración de variables desde Railway
2. Genera un `docker-compose.yml` para servicios imagen (DB, Redis, etc.)
3. Inicia los contenedores con las variables de producción (pero apuntando a `localhost`)
4. Configura un reverse proxy con Caddy para HTTPS local (requiere mkcert)
5. Ejecuta los servicios de código localmente (fuera de Docker) con las variables inyectadas

### Comandos útiles

```bash
railway dev                  # Iniciar todo
railway dev down             # Detener servicios
railway dev clean            # Detener y borrar volúmenes
railway dev configure        # Configurar qué servicios correr localmente
railway dev --dry-run        # Solo generar el compose, sin iniciar
```

### Limitaciones de railway dev

- **Experimental**: la API puede cambiar
- No replica el Dockerfile de producción (corre código local, no en contenedor)
- Requiere Docker y mkcert instalados
- Útil para desarrollo rápido, no para probar el Dockerfile de producción

Para probar el Dockerfile de producción local:

```bash
docker compose --profile production up -d
```

---

## 10. Consideraciones y Límites

### Railway Free Tier

| Aspecto | Límite |
|---|---|
| Build horas | 500 horas/mes |
| Ancho de banda | 100 GB/mes |
| Proyectos | Ilimitados |
| Servicios | Ilimitados (usa recursos compartidos) |
| Bases de datos | Ilimitadas (usa recursos compartidos) |
| Sleep | Servicios inactivos pasan a sleep (se despiertan con tráfico) |
| Storage compartido | 1 GB |

### Límites técnicos

| Aspecto | Límite |
|---|---|
| Build timeout | 30 minutos |
| Logs | 10 MB por deployment (rotación) |
| Variables | 256 KB total |
| Servicios por proyecto | ~50 (recomendado) |
| Conexiones DB | 15 conexiones concurrentes (free) |

### Buenas prácticas

**Seguridad**:
- Variables de entorno para secrets. Nunca en git.
- Usar `railway.toml` para config, no el dashboard manual.
- Healthchecks en todos los servicios.

**Performance**:
- Dockerfile multi-etapa para imágenes chicas.
- Cache mounts en build.
- `--only=production` en npm/pip.

**DevOps**:
- `.dockerignore` para excluir `node_modules`, `.env`, `dist/`.
- `railway.json` versionado en el repo.
- Watch paths en monorepos.

### Monorepo con Railway

```toml
# backend/railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"
watchPatterns = ["backend/**", "packages/shared/**"]

[deploy]
healthcheckPath = "/health"
```

```toml
# frontend/railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"
watchPatterns = ["frontend/**", "packages/shared/**"]

[deploy]
healthcheckPath = "/"
```

**Root Directory**: en el dashboard de cada servicio, configurar `Root Directory`
apuntando a `backend/` o `frontend/`. Railway solo trae los archivos de ese
directorio para el build.

### Resumen de archivos clave

| Archivo | Propósito | Versionado |
|---|---|---|
| `docker-compose.yml` | Desarrollo local | Sí |
| `Dockerfile` | Build multi-etapa | Sí |
| `.env` | Variables locales | **No** (gitignore) |
| `.env.example` | Plantilla de variables | Sí |
| `.dockerignore` | Excluir archivos del build | Sí |
| `railway.toml` o `railway.json` | Config Railway | Sí |
| `railpack.toml` | Config Railpack (opcional) | Sí |
| `nginx.conf` | Servir frontend estático | Sí |

---

> **Fuentes**: [docs.railway.com](https://docs.railway.com),
> [railpack.com](https://railpack.com),
> [Railway GitHub](https://github.com/railwayapp/docs).
> Verificado contra documentación oficial a mayo 2026.
