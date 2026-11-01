import { existsSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer auto-loads .env, and `bunx prisma` runs under Node,
// so load it explicitly. Real env vars (e.g. in CI) take precedence.
const envFile = join(import.meta.dirname, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
