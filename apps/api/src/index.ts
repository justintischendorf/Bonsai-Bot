import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { createLogger } from "@repo/logger";

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
  .onError(({ set }) => {
    set.status = 500;
    logger.error("Interner Serverfehler");
    return {
      success: false,
      message: "Ein Fehler ist aufgetreten",
      error: "INTERNAL_SERVER_ERROR",
    };
  })
  .listen(process.env.API_SERVER_PORT || 3001);

logger.info(`🦊 Elysia läuft auf http://localhost:${app.server?.port}`);

export type App = typeof app;
