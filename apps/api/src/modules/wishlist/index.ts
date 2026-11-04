import Elysia from "elysia";

import { IdParams } from "../../global/model";
import { sessionPlugin } from "../auth";
import { WishlistModel } from "./model";
import { WishlistService } from "./service";

export const wishlist = new Elysia({ prefix: "/wishlist" })
  .use(sessionPlugin)

  // --------------------------------------------------------------------------> GET api/wishlist
  //                                                                             - returns games added to wishlist
  .get("/", async ({ set }) => {
    set.status = 200;
    return {
      success: true,
      server: await WishlistService.getWishlist(),
    };
  })

  // --------------------------------------------------------------------------> GET api/wishlist/suggestion
  //                                                                             - returns a daily suggested game
  .get("/suggestion", async ({ set }) => {
    set.status = 200;
    return {
      success: true,
      server: await WishlistService.getWishlistSuggestion(),
    };
  })

  // --------------------------------------------------------------------------> POST api/wishlist
  //                                                                             - add a game to wishlist
  .post(
    "/",
    async ({ set, body, user }) => {
      set.status = 200;
      return {
        success: true,
        server: await WishlistService.addWishlistItem({
          body,
          userName: user.name,
        }),
      };
    },
    {
      body: WishlistModel.AddGameToWishlist,
    },
  )

  // --------------------------------------------------------------------------> DELETE api/wishlist
  //                                                                             - remove a game from wishlist
  .delete(
    "/:id",
    async ({ set, params }) => {
      set.status = 200;
      return {
        success: true,
        server: await WishlistService.removeWishlistItem(params),
      };
    },
    {
      params: IdParams,
    },
  );
