# ============================================================================
# Dockerfile multi-stage para el backend GestionLotes.
# Stages: builder → development | production
# ============================================================================

# ---- Build Stage ----
FROM node:20-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copiar el schema modular y las migraciones ANTES de `prisma generate`.
# Notas importantes:
#   - `prisma/` contiene el schema modular (preview `prismaSchemaFolder`).
#   - `migrations/` está como HERMANA de `prisma/` por convención de Prisma
#     cuando se usa esa preview apuntando a la carpeta `./prisma`. Si copias
#     SOLO `prisma/`, `prisma migrate deploy` falla en runtime con
#     "No migration found". Verificar con `prisma migrate status`.
COPY prisma ./prisma
COPY migrations ./migrations
RUN pnpm exec prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN pnpm run build


# ---- Development Stage ----
FROM builder AS development

COPY . .
RUN pnpm install

CMD ["pnpm", "run", "dev"]


# ---- Production Stage ----
FROM node:20-alpine AS production

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Instalación con --prod respeta el lockfile y excluye devDependencies.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Schema + migraciones se necesitan en runtime para `prisma migrate deploy`
# (Railway lo ejecuta en preDeployCommand).
COPY prisma ./prisma
COPY migrations ./migrations

# IMPORTANTE: regeneramos el cliente Prisma en este stage en lugar de copiarlo
# del builder. Razón: con pnpm, `node_modules/@prisma/client` es un SYMLINK a
# `node_modules/.pnpm/@prisma+client@<version>/node_modules/@prisma/client`.
# Copiar el symlink "tal cual" desde otro stage no preserva la estructura
# `.pnpm/...`, y el binding nativo (`query_engine-linux-musl.node`) falla en
# runtime con "Cannot find module". Regenerar es rápido (<2s) y robusto.
RUN pnpm exec prisma generate

# Compilado JS — ya no necesita TS ni nada más del builder.
COPY --from=builder /app/dist ./dist

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health',r=>process.exit(r.statusCode===200?0:1))" || exit 1

CMD ["node", "dist/main.js"]
