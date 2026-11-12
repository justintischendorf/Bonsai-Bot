import { prisma } from "@repo/database";
import type { WatchQueueModel as QueuedVideo } from "@repo/database/src/types";
import { createLogger } from "@repo/logger";

import { IdParams } from "../../global/model";
import { WatchModel } from "./model";

const logger = createLogger("api:watch");

const QUEUE_ORDER = [{ position: "asc" }, { id: "asc" }] as const;

const OEMBED_TIMEOUT_MS = 10_000;

const VIDEO_URL_PATTERN =
  /^(?:https?:\/\/)?(?:(?:www|m|music)\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})(?:[?&#/].*)?$/;

type Playback = {
  current: QueuedVideo | null;
  paused: boolean;
  position: number;
  updatedAt: number;
};

const playback: Playback = {
  current: null,
  paused: true,
  position: 0,
  updatedAt: Date.now(),
};

let lock: Promise<unknown> = Promise.resolve();
function exclusive<T>(task: () => Promise<T>) {
  const result = lock.then(task);
  lock = result.catch(() => undefined);
  return result;
}

function getPosition() {
  if (playback.paused) return playback.position;
  return playback.position + (Date.now() - playback.updatedAt) / 1000;
}

function setPlayback(changes: Partial<Playback>) {
  Object.assign(playback, changes, { updatedAt: Date.now() });
}

async function startNext() {
  const next = await prisma.watchQueue.findFirst({ orderBy: [...QUEUE_ORDER] });
  if (next) await prisma.watchQueue.delete({ where: { id: next.id } });
  setPlayback({ current: next, paused: !next, position: 0 });
}

function getYouTubeVideoId(url: string) {
  return url.trim().match(VIDEO_URL_PATTERN)?.[1] ?? null;
}

async function fetchVideoInfo(videoId: string) {
  const oembedUrl = new URL("https://www.youtube.com/oembed");
  oembedUrl.searchParams.set(
    "url",
    `https://www.youtube.com/watch?v=${videoId}`,
  );
  oembedUrl.searchParams.set("format", "json");

  const res = await fetch(oembedUrl, {
    signal: AbortSignal.timeout(OEMBED_TIMEOUT_MS),
  }).catch((error: Error) => {
    logger.error(`oembed request failed: ${error.message}`);
    throw new Error("VIDEO_LOAD_FAILED");
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("VIDEO_NOT_EMBEDDABLE");
  }
  if (res.status === 400 || res.status === 404) {
    throw new Error("VIDEO_NOT_FOUND");
  }
  if (!res.ok) {
    logger.error(`oembed request failed: status=${res.status}`);
    throw new Error("VIDEO_LOAD_FAILED");
  }

  const info = (await res.json()) as { title?: string; author_name?: string };
  return {
    title: info.title ?? "Unbekanntes Video",
    channel: info.author_name ?? "Unbekannter Kanal",
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}

export abstract class WatchService {
  // --------------------------------------------------------------------------> GET api/watch
  //                                                                             - returns the queue and the current playback
  static async getQueue() {
    const queue = await exclusive(async () => {
      if (!playback.current) await startNext();
      return prisma.watchQueue.findMany({ orderBy: [...QUEUE_ORDER] });
    });

    return {
      queue,
      current: playback.current,
      paused: playback.paused,
      position: getPosition(),
    };
  }

  // --------------------------------------------------------------------------> POST api/watch/add-video
  //                                                                             - add a video to the queue, starts it if nothing is playing
  static async addVideoToQueue({
    body,
    requestedBy,
  }: {
    body: WatchModel["AddVideoToQueue"];
    requestedBy: string;
  }) {
    logger.info("Adding video to queue");

    const videoId = getYouTubeVideoId(body.url);
    if (!videoId) throw new Error("INVALID_VIDEO_URL");

    const info = await fetchVideoInfo(videoId);

    return await exclusive(async () => {
      const { _max } = await prisma.watchQueue.aggregate({
        _max: { position: true },
      });
      const video = await prisma.watchQueue.create({
        data: {
          ...info,
          videoId,
          position: (_max.position ?? -1) + 1,
          requestedBy,
        },
      });

      if (!playback.current) await startNext();
      return video;
    });
  }

  // --------------------------------------------------------------------------> POST api/watch/play
  //                                                                             - continue the video for everyone at the given position
  static async playVideo(body: WatchModel["SetPlayback"]) {
    logger.info("Playing video", { position: body.position });
    if (!playback.current) throw new Error("NO_VIDEO_PLAYING");
    setPlayback({ paused: false, position: body.position });
  }

  // --------------------------------------------------------------------------> POST api/watch/pause
  //                                                                             - pause the video for everyone at the given position
  static async pauseVideo(body: WatchModel["SetPlayback"]) {
    logger.info("Pausing video", { position: body.position });
    if (!playback.current) throw new Error("NO_VIDEO_PLAYING");
    setPlayback({ paused: true, position: body.position });
  }

  // --------------------------------------------------------------------------> POST api/watch/seek
  //                                                                             - jump to a position for everyone, keeps playing or paused
  static async seekVideo(body: WatchModel["SetPlayback"]) {
    logger.info("Seeking video", { position: body.position });
    if (!playback.current) throw new Error("NO_VIDEO_PLAYING");
    setPlayback({ position: body.position });
  }

  // --------------------------------------------------------------------------> POST api/watch/skip
  //                                                                             - start the next video in the queue
  static async skipVideo(body: WatchModel["SkipVideo"]) {
    await exclusive(async () => {
      if (playback.current?.id !== body.currentId) return;
      logger.info("Skipping video", { videoId: body.currentId });
      await startNext();
    });
  }

  // --------------------------------------------------------------------------> POST api/watch/move-video/:id
  //                                                                             - move a video within the queue
  static async moveVideo({
    params,
    body,
  }: {
    params: (typeof IdParams)["static"];
    body: WatchModel["MoveVideo"];
  }) {
    logger.info("Moving video in queue", { videoId: params.id });

    await exclusive(async () => {
      const queue = await prisma.watchQueue.findMany({
        orderBy: [...QUEUE_ORDER],
        select: { id: true },
      });
      const ids = queue.map((video) => video.id);
      if (
        !ids.includes(params.id) ||
        (body.beforeId !== null && !ids.includes(body.beforeId))
      ) {
        throw new Error("VIDEO_NOT_IN_QUEUE");
      }
      if (params.id === body.beforeId) return;

      const reordered = ids.filter((id) => id !== params.id);
      const index =
        body.beforeId === null
          ? reordered.length
          : reordered.indexOf(body.beforeId);
      reordered.splice(index, 0, params.id);

      await prisma.$transaction(
        reordered.map((id, position) =>
          prisma.watchQueue.update({ where: { id }, data: { position } }),
        ),
      );
    });
  }

  // --------------------------------------------------------------------------> DELETE api/watch/remove-video/:id
  //                                                                             - remove a video from the queue
  static async removeVideoFromQueue(params: (typeof IdParams)["static"]) {
    logger.info("Removing video from queue", { videoId: params.id });

    await exclusive(async () => {
      const { count } = await prisma.watchQueue.deleteMany({
        where: { id: params.id },
      });
      if (count === 0) throw new Error("VIDEO_NOT_IN_QUEUE");
    });
  }
}
