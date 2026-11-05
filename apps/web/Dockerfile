# Build-Kontext ist das Repo-Root: docker build -f apps/web/Dockerfile .
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

FROM manifests AS build
# NEXT_PUBLIC_* wird beim Build fest ins Frontend geschrieben: bei einer Änderung neu bauen.
ARG NEXT_PUBLIC_API_SERVER_URL
ARG NEXT_PUBLIC_AUTH_BASE_URL
ENV NEXT_PUBLIC_API_SERVER_URL=$NEXT_PUBLIC_API_SERVER_URL
ENV NEXT_PUBLIC_AUTH_BASE_URL=$NEXT_PUBLIC_AUTH_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun install --frozen-lockfile
COPY packages packages
# Die Typen der API werden über @repo/treaty im Frontend gebraucht.
COPY apps/api apps/api
COPY apps/web apps/web
RUN cd packages/database && DATABASE_URL="file:/tmp/build.db" bunx prisma generate --config prisma7.config.ts
# Platzhalter nur für den Build, die echten Werte kommen zur Laufzeit aus der Compose-Datei.
RUN cd apps/web \
  && DATABASE_URL="file:/tmp/build.db" \
     BETTER_AUTH_SECRET="build-only-placeholder-build-only-placeholder" \
     BETTER_AUTH_URL="$NEXT_PUBLIC_AUTH_BASE_URL" \
     WEB_SERVER_URL="http://localhost:3000" \
     bun --bun next build

# Nur Laufzeit-Abhängigkeiten.
FROM manifests AS production-deps
RUN bun install --frozen-lockfile --production

FROM production-deps AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY packages/auth packages/auth
COPY packages/database/src packages/database/src
COPY packages/logger packages/logger
COPY --from=build /app/packages/database/generated packages/database/generated
COPY apps/web/next.config.ts apps/web/
COPY --from=build /app/apps/web/.next apps/web/.next
RUN rm -rf apps/web/.next/cache && mkdir -p apps/web/.next/cache /data && chown -R bun:bun apps/web/.next/cache /data
WORKDIR /app/apps/web
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["bun", "-e", "fetch('http://127.0.0.1:3000/login').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["bun", "--bun", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
