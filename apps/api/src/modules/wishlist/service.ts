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

    // Only released games are suggested, unreleased ones have a release date set
    const where = { releaseDate: null };

    const count = await prisma.wishlist.count({ where });
    if (count === 0) return null;

    const suggestion = await prisma.wishlist.findFirst({
      where,
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

    if (!body.steamLink && !body.instantGamingLink && !body.playstationLink) {
      throw new Error("NO_LINK_PROVIDED");
    }

    const existingGame = await prisma.wishlist.findFirst({
      where: {
        OR: [
          ...(body.steamLink ? [{ steamLink: body.steamLink }] : []),
          ...(body.instantGamingLink
            ? [{ instantGamingLink: body.instantGamingLink }]
            : []),
          ...(body.playstationLink
            ? [{ playstationLink: body.playstationLink }]
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
    const playstation = body.playstationLink
      ? await scrapePlayStation(body.playstationLink)
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

    if (playstation && (!playstation.name || Number.isNaN(playstation.price))) {
      throw new Error("PLAYSTATION_SCRAPING_FAILED");
    }

    const name = steam?.name || instantGaming?.name || playstation?.name || "";
    const description =
      steam?.description ||
      instantGaming?.description ||
      playstation?.description ||
      "";
    const releaseDate =
      steam?.releaseDate ||
      instantGaming?.releaseDate ||
      playstation?.releaseDate ||
      null;
    const imageUrl =
      steam?.imageUrl ||
      instantGaming?.imageUrl ||
      playstation?.imageUrl ||
      null;

    await prisma.wishlist.create({
      data: {
        name,
        description,
        steamPrice: steam?.price ?? null,
        instantGamingPrice: instantGaming?.price ?? null,
        playstationPrice: playstation?.price ?? null,
        steamLink: body.steamLink || null,
        instantGamingLink: body.instantGamingLink || null,
        playstationLink: body.playstationLink || null,
        releaseDate,
        imageUrl,
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
      const playstation = game.playstationLink
        ? await scrapeShop(scrapePlayStation, game.playstationLink)
        : null;
      const steamLinkBroken = Boolean(game.steamLink) && !steam;
      const instantGamingLinkBroken =
        Boolean(game.instantGamingLink) && !instantGaming;
      const playstationLinkBroken =
        Boolean(game.playstationLink) && !playstation;
      const anyLinkBroken =
        steamLinkBroken || instantGamingLinkBroken || playstationLinkBroken;

      const name =
        steam?.name || instantGaming?.name || playstation?.name || game.name;
      const description =
        steam?.description ||
        instantGaming?.description ||
        playstation?.description ||
        game.description;
      const releaseDate =
        steam?.releaseDate ||
        instantGaming?.releaseDate ||
        playstation?.releaseDate ||
        (anyLinkBroken ? game.releaseDate : null);
      const imageUrl =
        steam?.imageUrl ||
        instantGaming?.imageUrl ||
        playstation?.imageUrl ||
        game.imageUrl;
      // Without a fresh value the last known price stays, the card shows the hint next to it.
      const steamPrice = steam ? steam.price : game.steamPrice;
      const instantGamingPrice = instantGaming
        ? instantGaming.price
        : game.instantGamingPrice;
      const playstationPrice = playstation
        ? playstation.price
        : game.playstationPrice;

      await prisma.wishlist.update({
        where: { id: game.id },
        data: {
          name,
          description,
          steamPrice,
          instantGamingPrice,
          playstationPrice,
          steamLinkBroken,
          instantGamingLinkBroken,
          playstationLinkBroken,
          releaseDate,
          imageUrl,
        },
      });

      const priceDrops = [
        describePriceDrop("Steam", game.steamPrice, steamPrice),
        describePriceDrop(
          "Instant Gaming",
          game.instantGamingPrice,
          instantGamingPrice,
        ),
        describePriceDrop(
          "PlayStation Store",
          game.playstationPrice,
          playstationPrice,
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
    playstationPrice:
      item.playstationPrice === null
        ? null
        : priceFormatter.format(item.playstationPrice),
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

// Read the cover image, Steam and Instant Gaming provide it as a 616x353 og:image
function getImageUrl($: cheerio.CheerioAPI) {
  return $('meta[property="og:image"]').attr("content")?.trim() || null;
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

  // Skip boxes without a price, e.g. the free Friend's Pass that comes before the actual game
  const purchaseBox = $(
    ".game_area_purchase_game_wrapper:not(.dynamic_bundle_description) .game_area_purchase_game:not(.demo_above_purchase)",
  )
    .filter(
      (_, box) =>
        $(box).find(".discount_final_price, .game_purchase_price").length > 0,
    )
    .first();
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
    imageUrl: getImageUrl($),
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
    imageUrl: getImageUrl($),
  };
}

// Scrape PlayStation Store Page (concept or product page)
async function scrapePlayStation(
  url: string,
): Promise<WishlistModel["ScrapedShop"]> {
  const $ = await loadPage(url);
  const product = parsePlayStationProduct(
    $('script[type="application/ld+json"]').first().text(),
  );

  // Shown as e.g. "5.9.2024", announced games without a date have none
  const releaseText = $(
    '[data-qa="gameInfo#releaseInformation#releaseDate-value"]',
  )
    .first()
    .text()
    .trim();
  const releaseDay = parseGermanDate(releaseText);
  const price =
    typeof product.offers?.price === "number" ? product.offers.price : null;
  // The date decides when there is one, as pre-orders already have a price.
  // Without a date only announced games have no price.
  const unreleased =
    releaseDay !== null ? releaseDay > getCurrentDay() : price === null;

  return {
    name: product.name?.trim() ?? "",
    description: product.description?.replace(/\r/g, "").trim() ?? "",
    price: unreleased ? null : price,
    releaseDate: unreleased ? releaseText || "unbekannt" : null,
    imageUrl: getPlayStationImageUrl($) ?? product.image ?? null,
  };
}

function parsePlayStationProduct(json: string): {
  name?: string;
  description?: string;
  image?: string;
  offers?: { price?: number };
} {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

// The hero image is landscape like the other shops' covers, the page only embeds a tiny preview of it
function getPlayStationImageUrl($: cheerio.CheerioAPI) {
  const preview = $('img[data-qa="gameBackgroundImage#heroImage#preview"]')
    .first()
    .attr("src");
  if (!preview) return null;

  const url = new URL(preview);
  url.search = "?w=1280";
  return url.href;
}

// Turn "5.9.2024" into a day number comparable with getCurrentDay
function parseGermanDate(text: string) {
  const match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match.map(Number) as [
    number,
    number,
    number,
    number,
  ];
  return Date.UTC(year, month - 1, day) / 86_400_000;
}
