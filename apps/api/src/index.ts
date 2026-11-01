import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { createLogger } from "@repo/logger";

import { errorPlugin } from "./error-plugin";
import { authPlugin } from "./modules/auth";
import { server } from "./modules/server";

const logger = createLogger("api");

const app = new Elysia({ prefix: "/api" })
  .use(
    cors({
      origin: process.env.WEB_SERVER_URL?.replace(/\/$/, ""),
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  )
  .use(errorPlugin)
  .use(authPlugin)
  .use(server)
  .listen(process.env.API_SERVER_PORT || 3001);

logger.info(`🦊 Elysia läuft auf http://localhost:${app.server?.port}`);

export type App = typeof app;
