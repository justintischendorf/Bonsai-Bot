import { Elysia } from "elysia";

import { createLogger } from "@repo/logger";

const logger = createLogger("api:error");

const MUSIC_ERRORS: Record<string, { status: number; message: string }> = {
  USER_NOT_IN_VOICE: {
    status: 409,
    message: "Du musst zuerst einem Voice-Channel beitreten",
  },
  BOT_UNAVAILABLE: {
    status: 503,
    message: "Der Bot ist gerade nicht erreichbar",
  },
  BOT_NOT_IN_VOICE: {
    status: 409,
    message: "Starte zuerst eine Jam, damit der Bot im Voice-Channel ist",
  },
  VOICE_CONNECT_FAILED: {
    status: 502,
    message: "Der Bot konnte dem Voice-Channel nicht beitreten",
  },
  LAVALINK_UNAVAILABLE: {
    status: 503,
    message: "Der Musikserver ist gerade nicht erreichbar",
  },
  QUEUE_EMPTY: {
    status: 409,
    message: "Die Warteschlange ist leer",
  },
  NOTHING_PLAYING: {
    status: 409,
    message: "Gerade läuft kein Song",
  },
  SONG_INPUT_REQUIRED: {
    status: 400,
    message: "Gib einen Song-Namen oder einen Link an",
  },
  INVALID_SONG_URL: {
    status: 400,
    message: "Bitte gib einen gültigen YouTube-Link zu einem Video an",
  },
  SONG_IS_STREAM: {
    status: 400,
    message: "Livestreams können nicht abgespielt werden",
  },
  SONG_NOT_FOUND: {
    status: 404,
    message: "Dazu wurde kein Song gefunden",
  },
  SONG_LOAD_FAILED: {
    status: 502,
    message: "Der Song konnte nicht von YouTube geladen werden",
  },
  SONG_NOT_IN_QUEUE: {
    status: 404,
    message: "Der Song ist nicht mehr in der Warteschlange",
  },
};

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

    if (
      error instanceof Error &&
      error.message === "PLAYSTATION_SCRAPING_FAILED"
    ) {
      set.status = 400;
      logger.warn("PlayStation Store-Scraping fehlgeschlagen");
      return {
        success: false,
        message: "PlayStation Store-Scraping fehlgeschlagen",
        error: "PLAYSTATION_SCRAPING_FAILED",
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

    const musicError =
      error instanceof Error ? MUSIC_ERRORS[error.message] : undefined;
    if (error instanceof Error && musicError) {
      set.status = musicError.status;
      logger.warn(`Musikfehler: ${error.message}`);
      return {
        success: false,
        message: musicError.message,
        error: error.message,
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
