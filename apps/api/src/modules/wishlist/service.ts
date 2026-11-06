import * as cheerio from "cheerio";

import { prisma } from "@repo/database";
import type { WishlistModel as WishlistItem } from "@repo/database/src/types";
import { createLogger } from "@repo/logger";

import { IdParams } from "../../global/model";
import { DiscordService } from "../discord/service";
import { WishlistModel } from "./model";

const logger = createLogger("api:wishlist");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
  "Accept-Language": "de-DE",
};

const priceFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Preise bei Instant Gaming schwanken oft um wenige Cent, das soll nicht alle 30 Minuten eine Nachricht auslösen.
const MIN_PRICE_DROP_PERCENT = 10;

export abstract class WishlistService {
  // --------------------------------------------------------------------------> GET api/wishlist
  //                                                                             - returns games added to wishlist
  static async getWishlist() {
    logger.info("Fetching wishlist items from database");
    const wishlistItems = await prisma.wishlist.findMany();
    return wishlistItems.map(formatPrices);
  }

  // --------------------------------------------------------------------------> GET api/wishlist/suggestion
  //                                                                             - returns a daily suggested game
  static async getWishlistSuggestion() {
    logger.info("Fetching wishlist suggestion from database");

    const count = await prisma.wishlist.count();
    if (count === 0) return null;

    const suggestion = await prisma.wishlist.findFirst({
      orderBy: { id: "asc" },
      skip: getDailyIndex(count, getCurrentDay()),
    });
    return suggestion && formatPrices(suggestion);
  }

  // --------------------------------------------------------------------------> POST api/wishlist
  //                                                                             - add a game to wishlist
  static async addWishlistItem({
    body,
    userName,
  }: {
    body: WishlistModel["AddGameToWishlist"];
    userName: string;
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
        createdBy: userName,
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
      const steam = game.steamLink
        ? await scrapeShop(scrapeSteam, game.steamLink)
        : null;
      const instantGaming = game.instantGamingLink
        ? await scrapeShop(scrapeInstantGaming, game.instantGamingLink)
        : null;
      const steamLinkBroken = Boolean(game.steamLink) && !steam;
      const instantGamingLinkBroken =
        Boolean(game.instantGamingLink) && !instantGaming;

      const name = steam?.name || instantGaming?.name || game.name;
      const description =
        steam?.description || instantGaming?.description || game.description;
      const releaseDate =
        steam?.releaseDate ||
        instantGaming?.releaseDate ||
        (steamLinkBroken || instantGamingLinkBroken ? game.releaseDate : null);
      // Without a fresh value the last known price stays, the card shows the hint next to it.
      const steamPrice = steam ? steam.price : game.steamPrice;
      const instantGamingPrice = instantGaming
        ? instantGaming.price
        : game.instantGamingPrice;

      await prisma.wishlist.update({
        where: { id: game.id },
        data: {
          name,
          description,
          steamPrice,
          instantGamingPrice,
          steamLinkBroken,
          instantGamingLinkBroken,
          releaseDate,
        },
      });

      const priceDrops = [
        describePriceDrop("Steam", game.steamPrice, steamPrice),
        describePriceDrop(
          "Instant Gaming",
          game.instantGamingPrice,
          instantGamingPrice,
        ),
      ].filter((drop) => drop !== null);

      if (priceDrops.length > 0) await notifyPriceDrop(name, priceDrops);
    }
  }
}

// Returns null if the page is unreachable or unreadable, so one dead link can't stop the update of the other games
async function scrapeShop(
  scrape: (url: string) => Promise<WishlistModel["ScrapedShop"]>,
  url: string,
) {
  try {
    const shop = await scrape(url);
    if (!shop.name || Number.isNaN(shop.price)) {
      throw new Error("UNREADABLE_PAGE");
    }
    return shop;
  } catch (error) {
    logger.warn(`scraping failed: ${url} (${(error as Error).message})`);
    return null;
  }
}

// Returns a line like "Steam: 19,50 € → 14,99 €", or null if the price did not drop noticeably
function describePriceDrop(
  shop: string,
  oldPrice: number | null,
  newPrice: number | null,
) {
  if (oldPrice === null || newPrice === null) return null;
  if (newPrice > oldPrice * (1 - MIN_PRICE_DROP_PERCENT / 100)) return null;

  return `${shop}: ~~${priceFormatter.format(oldPrice)} €~~ → **${priceFormatter.format(newPrice)} €**`;
}

// A failed message must not stop the price update of the remaining games
async function notifyPriceDrop(name: string, priceDrops: string[]) {
  const channelId = process.env.WISHLIST_CHANNEL_ID;
  if (!channelId) {
    logger.warn(`${name} wurde reduziert, aber WISHLIST_CHANNEL_ID fehlt`);
    return;
  }

  const wishlistUrl = new URL("/wishlist", process.env.WEB_SERVER_URL);
  const content = [
    `🏷️ **${name}** wurde reduziert!`,
    ...priceDrops,
    wishlistUrl.href,
  ].join("\n");

  await DiscordService.sendChannelMessage(channelId, content).catch(() =>
    logger.error(`Preis-Nachricht für ${name} fehlgeschlagen`),
  );
}

// Format the prices for display, e.g. 1234.5 becomes "1.234,50"
function formatPrices(item: WishlistItem) {
  return {
    ...item,
    steamPrice:
      item.steamPrice === null ? null : priceFormatter.format(item.steamPrice),
    instantGamingPrice:
      item.instantGamingPrice === null
        ? null
        : priceFormatter.format(item.instantGamingPrice),
  };
}

// Get the current day number in German time, so the suggestion changes at local midnight
function getCurrentDay() {
  const date = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Berlin",
  });
  return Date.parse(date) / 86_400_000;
}

// Shuffle the indexes 0..count-1, the same seed always gives the same order
function shuffleIndexes(count: number, seed: number) {
  let state = seed;
  const random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const order = Array.from({ length: count }, (_, index) => index);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

// Pick the index for a day: every game once per cycle, in a new random order each cycle
function getDailyIndex(count: number, day: number) {
  if (count <= 2) return day % count;

  const cycle = Math.floor(day / count);
  const order = shuffleIndexes(count, cycle);

  // Avoid the same game twice in a row where two cycles meet
  if (order[0] === shuffleIndexes(count, cycle - 1)[count - 1]) {
    [order[0], order[1]] = [order[1]!, order[0]!];
  }

  return order[day % count]!;
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
