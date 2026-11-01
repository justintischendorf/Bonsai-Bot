import { Elysia } from "elysia";

import { createLogger } from "@repo/logger";

const logger = createLogger("api:error");

export const errorPlugin = new Elysia({ name: "error" }).onError(
  { as: "global" },
  ({ code, error, set }) => {
    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        success: false,
        message: "Nicht gefunden",
        error: "NOT_FOUND",
      };
    }

    if (code === "VALIDATION") {
      set.status = 422;
      logger.warn("Validierungsfehler");
      return {
        success: false,
        message: "Validierungsfehler",
        error: "VALIDATION_ERROR",
      };
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      set.status = 401;
      logger.warn("Nicht autorisiert");
      return {
        success: false,
        message: "Nicht autorisiert",
        error: "UNAUTHORIZED",
      };
    }

    if (error instanceof Error && error.message === "DISCORD_REQUEST_FAILED") {
      set.status = 502;
      logger.warn("Discord-Anfrage fehlgeschlagen");
      return {
        success: false,
        message: "Discord ist gerade nicht erreichbar",
        error: "DISCORD_REQUEST_FAILED",
      };
    }

    set.status = 500;
    logger.error("Interner Serverfehler");
    return {
      success: false,
      message: "Ein Fehler ist aufgetreten",
      error: "INTERNAL_SERVER_ERROR",
    };
  },
);
