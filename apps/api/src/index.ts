import cron, { Patterns } from "@elysia/cron";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { createLogger } from "@repo/logger";

import { errorPlugin } from "./error-plugin";
import { authPlugin } from "./modules/auth";
import { discord } from "./modules/discord";
import { music } from "./modules/music";
import { watch } from "./modules/watch";
import { wishlist } from "./modules/wishlist";
import { WishlistService } from "./modules/wishlist/service";

const logger = createLogger("api");

const app = new Elysia({ prefix: "/api" })
  .use(errorPlugin)
  .use(
    cors({
      origin: process.env.WEB_SERVER_URL?.replace(/\/$/, ""),
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  )
  .use(
    cron({
      name: "update-wishlist-prices",
      pattern: Patterns.EVERY_30_MINUTES,
      async run() {
        await WishlistService.updateWishlistPrices();
      },
    }),
  )
  .get("/health", () => ({ status: "ok" }))
  .use(authPlugin)
  .use(music)
  .use(discord)
  .use(wishlist)
  .use(watch)
  .listen(process.env.API_SERVER_PORT || 3001);

logger.info(`🦊 Elysia läuft auf http://localhost:${app.server?.port}`);

export type App = typeof app;
