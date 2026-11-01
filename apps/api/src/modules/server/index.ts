import Elysia from "elysia";

import { sessionPlugin } from "../auth";
import { ServerService } from "./service";

export const server = new Elysia({ prefix: "/server" })
  .use(sessionPlugin)

  // --------------------------------------------------------------------------> GET api/server/info
  //                                                                             - name, icon and member count
  .get("/info", async ({ set }) => {
    set.status = 200;
    return {
      success: true,
      server: await ServerService.getServer(),
    };
  })

  // --------------------------------------------------------------------------> GET api/server/members
  //                                                                             - list of all members
  .get("/members", async ({ set }) => {
    set.status = 200;
    return {
      success: true,
      members: await ServerService.getMembers(),
    };
  });
