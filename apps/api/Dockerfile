# Build-Kontext ist das Repo-Root: docker build -f apps/api/Dockerfile .
FROM oven/bun:1.4.2-slim AS base
WORKDIR /app

# Alle Manifeste sind nötig, damit das Lockfile zum Workspace passt.
FROM base AS manifests
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/bot/package.json apps/bot/
COPY apps/web/package.json apps/web/
COPY packages/api-client/package.json packages/api-client/
COPY packages/auth/package.json packages/auth/
COPY packages/database/package.json packages/database/
COPY packages/logger/package.json packages/logger/
COPY packages/treaty/package.json packages/treaty/

# Komplette Installation mit Prisma-CLI: erzeugt den Client und führt Migrationen aus.
FROM manifests AS tooling
RUN bun install --frozen-lockfile
COPY packages/database/prisma packages/database/prisma
COPY packages/database/prisma7.config.ts packages/database/
RUN cd packages/database && DATABASE_URL="file:/tmp/build.db" bunx prisma generate --config prisma7.config.ts

# Einmal-Container für "prisma migrate deploy".
FROM tooling AS migrate
RUN mkdir -p /data && chown -R bun:bun /data /app/packages/database
WORKDIR /app/packages/database
USER bun
CMD ["bunx", "prisma", "migrate", "deploy", "--config", "prisma7.config.ts"]

# Nur Laufzeit-Abhängigkeiten.
FROM manifests AS production-deps
RUN bun install --frozen-lockfile --production

FROM production-deps AS runner
ENV NODE_ENV=production
COPY packages/auth packages/auth
COPY packages/database/src packages/database/src
COPY packages/logger packages/logger
COPY apps/api apps/api
COPY --from=tooling /app/packages/database/generated packages/database/generated
RUN mkdir -p /data && chown -R bun:bun /data
WORKDIR /app/apps/api
USER bun
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["bun", "-e", "fetch(`http://127.0.0.1:${process.env.API_SERVER_PORT || 3001}/api/health`).then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["bun", "src/index.ts"]
