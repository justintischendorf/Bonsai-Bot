import Elysia from "elysia";

import { IdParams } from "../../global/model";
import { sessionPlugin } from "../auth";
import { WatchModel } from "./model";
import { WatchService } from "./service";

const unsubscribers = new Map<string, () => void>();

export const watch = new Elysia({ prefix: "/watch" })
  .use(sessionPlugin)

  // --------------------------------------------------------------------------> WS api/watch/live
  //                                                                             - pushes the queue and playback on every change
  .ws("/live", {
    async open(ws) {
      unsubscribers.set(
        ws.id,
        WatchService.subscribe((state) => ws.send(state)),
      );
      ws.send(await WatchService.getQueue());
    },
    // Lets clients measure the offset between their clock and the server clock.
    message(ws, message) {
      ws.send({
        type: "pong",
        clientTime: message.clientTime,
        serverTime: Date.now(),
      });
    },
    body: WatchModel.LiveMessage,
    close(ws) {
      unsubscribers.get(ws.id)?.();
      unsubscribers.delete(ws.id);
    },
  })

  // --------------------------------------------------------------------------> GET api/watch
  //                                                                             - shows watch queue and current playback
  .get("/", async ({ set }) => {
    set.status = 200;
    return {
      success: true,
      server: await WatchService.getQueue(),
    };
  })

  // --------------------------------------------------------------------------> POST api/watch/add-video
  //                                                                             - add a video to the queue
  .post(
    "/add-video",
    async ({ set, body, user }) => {
      set.status = 200;
      return {
        success: true,
        server: await WatchService.addVideoToQueue({
          body,
          requestedBy: user.name,
        }),
      };
    },
    {
      body: WatchModel.AddVideoToQueue,
    },
  )

  // --------------------------------------------------------------------------> POST api/watch/play
  //                                                                             - continue the video for everyone
  .post(
    "/play",
    async ({ set, body }) => {
      set.status = 200;
      return {
        success: true,
        server: await WatchService.playVideo(body),
      };
    },
    { body: WatchModel.SetPlayback },
  )

  // --------------------------------------------------------------------------> POST api/watch/pause
  //                                                                             - pause the video for everyone
  .post(
    "/pause",
    async ({ set, body }) => {
      set.status = 200;
      return {
        success: true,
        server: await WatchService.pauseVideo(body),
      };
    },
    { body: WatchModel.SetPlayback },
  )

  // --------------------------------------------------------------------------> POST api/watch/seek
  //                                                                             - jump to a position for everyone
  .post(
    "/seek",
    async ({ set, body }) => {
      set.status = 200;
      return {
        success: true,
        server: await WatchService.seekVideo(body),
      };
    },
    { body: WatchModel.SetPlayback },
  )

  // --------------------------------------------------------------------------> POST api/watch/skip
  //                                                                             - start the next video in the queue
  .post(
    "/skip",
    async ({ set, body }) => {
      set.status = 200;
      return {
        success: true,
        server: await WatchService.skipVideo(body),
      };
    },
    { body: WatchModel.SkipVideo },
  )

  // --------------------------------------------------------------------------> POST api/watch/move-video/:id
  //                                                                             - move a video within the queue
  .post(
    "/move-video/:id",
    async ({ set, params, body }) => {
      set.status = 200;
      return {
        success: true,
        server: await WatchService.moveVideo({ params, body }),
      };
    },
    { params: IdParams, body: WatchModel.MoveVideo },
  )

  // --------------------------------------------------------------------------> DELETE api/watch/remove-video/:id
  //                                                                             - remove a video from the queue
  .delete(
    "/remove-video/:id",
    async ({ set, params }) => {
      set.status = 200;
      return {
        success: true,
        server: await WatchService.removeVideoFromQueue(params),
      };
    },
    { params: IdParams },
  );
