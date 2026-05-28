# ---- Build Stage ----
FROM node:20-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copiar prisma ANTES del generate, y antes del build (tsc lee @prisma/client tipados)
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

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Prisma schema + migraciones se necesitan en runtime para `migrate deploy`.
COPY prisma ./prisma
COPY migrations ./migrations
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health',r=>process.exit(r.statusCode===200?0:1))" || exit 1

CMD ["node", "dist/main.js"]
