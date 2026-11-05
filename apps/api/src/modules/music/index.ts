import Elysia from "elysia";

import { IdParams } from "../../global/model";
import { sessionPlugin } from "../auth";
import { MusicModel } from "./model";
import { MusicService } from "./service";

export const music = new Elysia({ prefix: "/music" })
  .use(sessionPlugin)

  // --------------------------------------------------------------------------> POST api/music
  //                                                                             - shows music queue
  .get("/", async ({ set }) => {
    set.status = 200;
    return {
      success: true,
      server: await MusicService.getQueue(),
    };
  })

  // --------------------------------------------------------------------------> POST api/music/join
  //                                                                             - bot should join channel
  .post("/join", async ({ set, user }) => {
    set.status = 200;
    return {
      success: true,
      server: await MusicService.joinChannel(user.id),
    };
  })

  // --------------------------------------------------------------------------> POST api/music/leave
  //                                                                             - bot should leave channel
  .post("/leave", async ({ set }) => {
    set.status = 200;
    return {
      success: true,
      server: await MusicService.leaveChannel(),
    };
  })

  // --------------------------------------------------------------------------> POST api/music/play
  //                                                                             - bot should start playing music
  .post("/play", async ({ set }) => {
    set.status = 200;
    return {
      success: true,
      server: await MusicService.playMusic(),
    };
  })

  // --------------------------------------------------------------------------> POST api/music/stop
  //                                                                             - bot should stop playing music
  .post("/stop", async ({ set }) => {
    set.status = 200;
    return {
      success: true,
      server: await MusicService.stopMusic(),
    };
  })

  // --------------------------------------------------------------------------> POST api/music/skip
  //                                                                             - bot should skip the current song
  .post("/skip", async ({ set }) => {
    set.status = 200;
    return {
      success: true,
      server: await MusicService.skipSong(),
    };
  })

  // --------------------------------------------------------------------------> GET api/music/add-song
  //                                                                             - bot should add a song to the queue
  .post(
    "/add-song",
    async ({ set, body, user }) => {
      set.status = 200;
      return {
        success: true,
        server: await MusicService.addSongToQueue({
          body,
          requestedBy: user.name,
        }),
      };
    },
    {
      body: MusicModel.AddSongToQueue,
    },
  )

  // --------------------------------------------------------------------------> POST api/music/move-song/:id
  //                                                                             - bot should move a song within the queue
  .post(
    "/move-song/:id",
    async ({ set, params, body }) => {
      set.status = 200;
      return {
        success: true,
        server: await MusicService.moveSong({ params, body }),
      };
    },
    { params: IdParams, body: MusicModel.MoveSong },
  )

  // --------------------------------------------------------------------------> GET api/music/remove-song/:id
  //                                                                             - bot should remove a song from the queue
  .delete(
    "/remove-song/:id",
    async ({ set, params }) => {
      set.status = 200;
      return {
        success: true,
        server: await MusicService.removeSongFromQueue(params),
      };
    },
    { params: IdParams },
  );
