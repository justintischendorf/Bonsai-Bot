import * as cheerio from "cheerio";

import { prisma } from "@repo/database";
import { createLogger } from "@repo/logger";

import { IdParams } from "../../global/model";
import { WishlistModel } from "./model";

const logger = createLogger("api:wishlist");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
  "Accept-Language": "de-DE",
};

export abstract class WishlistService {
  // --------------------------------------------------------------------------> GET api/wishlist
  //                                                                             - returns games added to wishlist
  static async getWishlist() {
    logger.info("Fetching wishlist items from database");
    return prisma.wishlist.findMany();
  }

  // --------------------------------------------------------------------------> POST api/wishlist
  //                                                                             - add a game to wishlist
  static async addWishlistItem({
    body,
  }: {
    body: WishlistModel["AddGameToWishlist"];
  }) {
    logger.info("Adding wishlist item to database", { body });

    if (!body.steamLink && !body.instantGamingLink) {
      throw new Error("NO_LINK_PROVIDED");
    }

    const existingGame = await prisma.wishlist.findFirst({
      where: {
        OR: [
          ...(body.steamLink ? [{ steamLink: body.steamLink }] : []),
          ...(body.instantGamingLink
            ? [{ instantGamingLink: body.instantGamingLink }]
            : []),
        ],
      },
    });

    if (existingGame) {
      throw new Error("GAME_ALREADY_EXISTS");
    }

    const steam = body.steamLink ? await scrapeSteam(body.steamLink) : null;
    const instantGaming = body.instantGamingLink
      ? await scrapeInstantGaming(body.instantGamingLink)
      : null;

    if (steam && (!steam.name || Number.isNaN(steam.price))) {
      throw new Error("STEAM_SCRAPING_FAILED");
    }

    if (
      instantGaming &&
      (!instantGaming.name || Number.isNaN(instantGaming.price))
    ) {
      throw new Error("INSTANT_GAMING_SCRAPING_FAILED");
    }

    const name = steam?.name || instantGaming?.name || "";
    const description = steam?.description || instantGaming?.description || "";
    const releaseDate =
      steam?.releaseDate || instantGaming?.releaseDate || null;

    await prisma.wishlist.create({
      data: {
        name,
        description,
        steamPrice: steam?.price ?? null,
        instantGamingPrice: instantGaming?.price ?? null,
        steamLink: body.steamLink || null,
        instantGamingLink: body.instantGamingLink || null,
        releaseDate,
      },
    });
  }

  // --------------------------------------------------------------------------> DELETE api/wishlist
  //                                                                             - remove a game from wishlist
  static async removeWishlistItem(params: (typeof IdParams)["static"]) {
    logger.info("Removing wishlist item from database", { body: params });
    return prisma.wishlist.delete({ where: { id: params.id } });
  }

  // --------------------------------------------------------------------------> CRON
  //                                                                             - fetch current prices for all games in wishlist and update them in database
  static async updateWishlistPrices() {
    const wishlistItems = await prisma.wishlist.findMany();

    for (const game of wishlistItems) {
      let steam: WishlistModel["ScrapedShop"] | null = null;
      let instantGaming: WishlistModel["ScrapedShop"] | null = null;

      if (game.steamLink) {
        try {
          steam = await scrapeSteam(game.steamLink);
        } catch {
          throw new Error("STEAM_SCRAPING_FAILED");
        }
      }

      if (game.instantGamingLink) {
        try {
          instantGaming = await scrapeInstantGaming(game.instantGamingLink);
        } catch {
          throw new Error("INSTANT_GAMING_SCRAPING_FAILED");
        }
      }

      const name = steam?.name || instantGaming?.name || game.name;
      const description =
        steam?.description || instantGaming?.description || game.description;
      const releaseDate =
        steam || instantGaming
          ? steam?.releaseDate || instantGaming?.releaseDate || null
          : game.releaseDate;

      await prisma.wishlist.update({
        where: { id: game.id },
        data: {
          name,
          description,
          steamPrice: steam?.price ?? null,
          instantGamingPrice: instantGaming?.price ?? null,
          releaseDate,
        },
      });
    }
  }
}

// Fetch the page and load it into Cheerio
async function loadPage(url: string) {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error("FAILED_TO_FETCH_PAGE");
  return cheerio.load(await response.text());
}

// Parse the price from the text
function parsePrice(text: string) {
  return parseFloat(
    text.replace("€", "").replace(",", ".").replace("--", "00").trim(),
  );
}

// Scrape Steam Page
async function scrapeSteam(url: string): Promise<WishlistModel["ScrapedShop"]> {
  const $ = await loadPage(url);

  const purchaseBox = $(
    ".game_area_purchase_game_wrapper:not(.dynamic_bundle_description) .game_area_purchase_game:not(.demo_above_purchase)",
  ).first();
  const price =
    purchaseBox.find(".discount_final_price").first().text() ||
    purchaseBox.find(".game_purchase_price").first().text();
  const comingSoon = !purchaseBox.length && $(".game_area_comingsoon").length;

  return {
    name: $(".apphub_AppName").first().text().trim(),
    description: $(".game_description_snippet").first().text().trim(),
    price: comingSoon ? null : parsePrice(price),
    releaseDate: comingSoon
      ? $(".release_date .date").first().text().trim() || "unbekannt"
      : null,
  };
}

// Scrape Instant Gaming Page
async function scrapeInstantGaming(
  url: string,
): Promise<WishlistModel["ScrapedShop"]> {
  const $ = await loadPage(url);
  const release = $(".subinfos .release").first().text().trim();

  return {
    name: $(".game-title")
      .first()
      .text()
      .trim()
      .replace(/ - PC( \(.*\))?$/, ""),
    description: $('[itemprop="description"]').first().text().trim(),
    price:
      release || $(".subinfos .nostock").length
        ? null
        : parsePrice($(".total").first().text()),
    releaseDate: release
      ? release.replace(/^Release:\s*/, "") || "unbekannt"
      : null,
  };
}
