import Elysia from "elysia";

import { sessionPlugin } from "../auth";
import { DiscordService } from "./service";

export const discord = new Elysia({ prefix: "/discord" })
  .use(sessionPlugin)

  // --------------------------------------------------------------------------> GET api/discord/info
  //                                                                             - name, icon and member count
  .get("/info", async ({ set }) => {
    set.status = 200;
    return {
      success: true,
      server: await DiscordService.getServer(),
    };
  })

  // --------------------------------------------------------------------------> GET api/discord/members
  //                                                                             - list of all members with avatar, online status and current game
  .get("/members", async ({ set }) => {
    set.status = 200;
    return {
      success: true,
      members: await DiscordService.getMembers(),
    };
  });
