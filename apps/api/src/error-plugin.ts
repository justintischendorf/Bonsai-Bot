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

    if (error instanceof Error && error.message === "PRESENCE_UNAVAILABLE") {
      set.status = 503;
      logger.warn("Online-Status nicht verfügbar");
      return {
        success: false,
        message: "Der Online-Status ist gerade nicht verfügbar",
        error: "PRESENCE_UNAVAILABLE",
      };
    }

    if (error instanceof Error && error.message === "NO_LINK_PROVIDED") {
      set.status = 400;
      logger.warn("Kein Link angegeben");
      return {
        success: false,
        message: "Kein Link wurde angegeben",
        error: "NO_LINK_PROVIDED",
      };
    }

    if (error instanceof Error && error.message === "GAME_ALREADY_EXISTS") {
      set.status = 400;
      logger.warn("Spiel existiert bereits in der Wunschliste");
      return {
        success: false,
        message: "Spiel existiert bereits in der Wunschliste",
        error: "GAME_ALREADY_EXISTS",
      };
    }

    if (error instanceof Error && error.message === "STEAM_SCRAPING_FAILED") {
      set.status = 400;
      logger.warn("Steam-Scraping fehlgeschlagen");
      return {
        success: false,
        message: "Steam-Scraping fehlgeschlagen",
        error: "STEAM_SCRAPING_FAILED",
      };
    }

    if (
      error instanceof Error &&
      error.message === "INSTANT_GAMING_SCRAPING_FAILED"
    ) {
      set.status = 400;
      logger.warn("Instant Gaming-Scraping fehlgeschlagen");
      return {
        success: false,
        message: "Instant Gaming-Scraping fehlgeschlagen",
        error: "INSTANT_GAMING_SCRAPING_FAILED",
      };
    }

    if (error instanceof Error && error.message === "FAILED_TO_FETCH_PAGE") {
      set.status = 400;
      logger.warn("Seite konnte nicht abgerufen werden");
      return {
        success: false,
        message: "Seite konnte nicht abgerufen werden",
        error: "FAILED_TO_FETCH_PAGE",
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
