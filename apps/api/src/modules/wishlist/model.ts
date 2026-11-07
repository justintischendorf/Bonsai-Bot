import { t, type UnwrapSchema } from "elysia";

export namespace WishlistModel {
  export const AddGameToWishlist = t.Object({
    steamLink: t.Optional(t.String()),
    instantGamingLink: t.Optional(t.String()),
    playstationLink: t.Optional(t.String()),
    crossplayAvailable: t.Boolean(),
  });

  export const ScrapedShop = t.Object({
    name: t.String(),
    description: t.String(),
    price: t.Union([t.Number(), t.Null()]),
    releaseDate: t.Union([t.String(), t.Null()]),
    imageUrl: t.Union([t.String(), t.Null()]),
  });
}

export type WishlistModel = {
  [k in keyof typeof WishlistModel]: UnwrapSchema<(typeof WishlistModel)[k]>;
};
