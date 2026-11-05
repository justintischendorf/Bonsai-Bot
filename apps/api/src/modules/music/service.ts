import { prisma } from "@repo/database";
import { createLogger } from "@repo/logger";

import { IdParams } from "../../global/model";
import { MusicModel } from "./model";

const logger = createLogger("api:music");

const BOT_TIMEOUT_MS = 25_000;

// Fehlercodes des Bots, die an den Nutzer weitergegeben werden. Die Texte stehen im error-plugin.
const BOT_ERRORS = new Set([
  "USER_NOT_IN_VOICE",
  "BOT_NOT_IN_VOICE",
  "VOICE_CONNECT_FAILED",
  "LAVALINK_UNAVAILABLE",
  "QUEUE_EMPTY",
  "NOTHING_PLAYING",
  "SONG_INPUT_REQUIRED",
  "INVALID_SONG_URL",
  "SONG_IS_STREAM",
  "SONG_NOT_FOUND",
  "SONG_LOAD_FAILED",
  "SONG_NOT_IN_QUEUE",
]);

type CurrentSong = {
  title: string;
  artist: string;
  url: string;
  duration: number;
  artworkUrl: string | null;
  requestedBy: string;
};

type QueuedSong = CurrentSong & { id: number; createdAt: string };

// Die Warteschlange gehört dem Bot: In der Entwicklung liegt sie in dessen eigener Datenbank im Docker-Volume.
type MusicState = {
  queue: QueuedSong[];
  connected: boolean;
  channelId: string | null;
  paused: boolean;
  position: number;
  current: CurrentSong | null;
  lastFailure: { title: string; at: number } | null;
};

const OFFLINE_STATE: MusicState = {
  queue: [],
  connected: false,
  channelId: null,
  paused: false,
  position: 0,
  current: null,
  lastFailure: null,
};

async function callBot(
  path: string,
  { method = "POST", body }: { method?: string; body?: object } = {},
) {
  const res = await fetch(`${process.env.BOT_INTERNAL_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.BOT_INTERNAL_SECRET ?? "",
    },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(BOT_TIMEOUT_MS),
  }).catch((error: Error) => {
    logger.error(`bot request failed: ${error.message}`);
    throw new Error("BOT_UNAVAILABLE");
  });

  if (res.ok) return res;

  const payload = (await res.json().catch(() => null)) as {
    error?: string;
  } | null;
  if (payload?.error && BOT_ERRORS.has(payload.error)) {
    throw new Error(payload.error);
  }

  logger.error(`bot request failed: status=${res.status}`);
  throw new Error("BOT_UNAVAILABLE");
}

export abstract class MusicService {
  // --------------------------------------------------------------------------> GET api/music
  //                                                                             - returns the queue and the current playback
  static async getQueue() {
    return await callBot("/music/state", { method: "GET" })
      .then((res) => res.json() as Promise<MusicState>)
      .catch(() => OFFLINE_STATE);
  }

  // --------------------------------------------------------------------------> POST api/music/join
  //                                                                             - bot should join channel
  static async joinChannel(userId: string) {
    logger.info("Joining voice channel");

    const account = await prisma.account.findFirst({
      where: { userId, providerId: "discord" },
    });
    if (!account) throw new Error("UNAUTHORIZED");

    const res = await callBot("/voice/join", {
      body: { discordUserId: account.accountId },
    });

    return (await res.json()) as { channelId: string };
  }

  // --------------------------------------------------------------------------> POST api/music/leave
  //                                                                             - bot should leave channel and clear the queue
  static async leaveChannel() {
    logger.info("Leaving voice channel");
    await callBot("/voice/leave");
  }

  // --------------------------------------------------------------------------> POST api/music/play
  //                                                                             - bot should start or resume playing music
  static async playMusic() {
    logger.info("Starting music playback");
    await callBot("/music/play");
  }

  // --------------------------------------------------------------------------> POST api/music/stop
  //                                                                             - bot should pause the music
  static async stopMusic() {
    logger.info("Pausing music playback");
    await callBot("/music/stop");
  }

  // --------------------------------------------------------------------------> POST api/music/skip
  //                                                                             - bot should skip the current song
  static async skipSong() {
    logger.info("Skipping song");
    await callBot("/music/skip");
  }

  // --------------------------------------------------------------------------> POST api/music/add-song
  //                                                                             - bot should add a song to the queue
  static async addSongToQueue({
    body,
    requestedBy,
  }: {
    body: MusicModel["AddSongToQueue"];
    requestedBy: string;
  }) {
    logger.info("Adding song to queue");

    const res = await callBot("/music/songs", {
      body: { ...body, requestedBy },
    });

    return (await res.json()) as QueuedSong;
  }

  // --------------------------------------------------------------------------> POST api/music/move-song/:id
  //                                                                             - bot should move a song within the queue
  static async moveSong({
    params,
    body,
  }: {
    params: (typeof IdParams)["static"];
    body: MusicModel["MoveSong"];
  }) {
    logger.info("Moving song in queue", { songId: params.id });
    await callBot(`/music/songs/${params.id}/move`, { body });
  }

  // --------------------------------------------------------------------------> DELETE api/music/remove-song/:id
  //                                                                             - bot should remove a song from the queue
  static async removeSongFromQueue(params: (typeof IdParams)["static"]) {
    logger.info("Removing song from queue", { songId: params.id });
    await callBot(`/music/songs/${params.id}`, {
      method: "DELETE",
    });
  }
}
