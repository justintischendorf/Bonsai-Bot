import type { Client, Guild } from "discord.js";
import { LavalinkManager, type Player } from "lavalink-client";

import { prisma } from "@repo/database";
import type { MusicQueueModel } from "@repo/database/src/types";

import { config, required } from "./config.ts";

const NODE_ID = "main";
const VOICE_READY_TIMEOUT_MS = 15_000;
const VOICE_READY_POLL_MS = 200;
const JOIN_FAILED = "JoinFailed";

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
]);
const YOUTUBE_PATH_PREFIXES = new Set(["shorts", "live", "embed"]);
const YOUTUBE_VIDEO_ID = /^[\w-]{11}$/;
// Muss zu images.remotePatterns der Website passen: next/image wirft bei anderen Hosts einen Fehler.
const ARTWORK_URL_PREFIX = "https://i.ytimg.com/";
const QUEUE_ORDER = [{ position: "asc" }, { id: "asc" }] as const;

export class MusicError extends Error {
  constructor(
    code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

// Reduziert jeden Link auf das einzelne Video: Links mit "list=" würden sonst eine ganze Playlist laden.
export function toYoutubeVideoUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new MusicError("INVALID_SONG_URL", 400);
  }

  const [firstSegment, secondSegment] = url.pathname.split("/").filter(Boolean);
  let videoId: string | null | undefined;
  if (url.hostname === "youtu.be") {
    videoId = firstSegment;
  } else if (YOUTUBE_HOSTS.has(url.hostname)) {
    videoId =
      firstSegment === "watch"
        ? url.searchParams.get("v")
        : firstSegment && YOUTUBE_PATH_PREFIXES.has(firstSegment)
          ? secondSegment
          : undefined;
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    !videoId ||
    !YOUTUBE_VIDEO_ID.test(videoId)
  ) {
    throw new MusicError("INVALID_SONG_URL", 400);
  }
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export class MusicPlayer {
  private readonly manager: LavalinkManager;
  // Der laufende Song ist schon aus der Datenbank entfernt und liegt nur hier.
  private current: MusicQueueModel | null = null;
  // Sorgt dafür, dass nach "Abspielen" neue Songs automatisch starten, bis pausiert wird.
  private autoplay = false;
  // Damit die Website melden kann, wenn ein Song nicht abspielbar war und übersprungen wurde.
  private lastFailure: { title: string; at: number } | null = null;
  private lastAction: Promise<unknown> = Promise.resolve();

  constructor(private readonly client: Client) {
    this.manager = new LavalinkManager({
      nodes: [
        {
          id: NODE_ID,
          host: config.lavalinkHost,
          port: config.lavalinkPort,
          authorization: required("LAVALINK_PASSWORD"),
          // Lavalink startet langsamer als der Bot und darf auch später neu starten.
          retryAmount: 100_000,
          retryDelay: 5_000,
          // Sonst ruft die Bibliothek ws.close(500) auf, was unter Bun eine Exception wirft.
          closeOnError: false,
        },
      ],
      sendToShard: (guildId, payload) =>
        this.client.guilds.cache.get(guildId)?.shard.send(payload),
      // Die Warteschlange liegt in der Datenbank, die Queue der Bibliothek bleibt immer leer.
      autoSkip: false,
      playerOptions: {
        onDisconnect: { destroyPlayer: true },
        // Defekte Songs werden einzeln übersprungen, statt die ganze Jam zu beenden.
        maxErrorsPerTime: { threshold: 0, maxAmount: 0 },
      },
    });

    this.manager.nodeManager
      .on("connect", () => console.log("Lavalink verbunden"))
      .on("disconnect", (_node, reason) => {
        console.warn("Lavalink getrennt:", reason);
        // Ein Neustart von Lavalink verwirft den Player, ohne Ton zu spielen wäre die Jam nur noch Schein.
        void this.exclusive(() => this.abortJam()).catch((error) =>
          console.error("Jam konnte nicht beendet werden:", error),
        );
      })
      .on("error", (_node, error) =>
        console.error("Lavalink-Fehler:", error.message),
      );

    this.manager
      .on("queueEnd", () => {
        void this.exclusive(() => this.onTrackEnded()).catch((error) =>
          console.error("Nächster Song konnte nicht starten:", error),
        );
      })
      .on("trackError", (_player, _track, payload) => {
        console.error(
          `Song "${this.current?.title}" fehlgeschlagen:`,
          payload.exception?.message,
        );
        this.lastFailure = {
          title: this.current?.title ?? "Unbekannter Song",
          at: Date.now(),
        };
      })
      .on("trackStuck", (_player, track) =>
        console.warn(`Song "${track?.info.title}" hängt und wird übersprungen`),
      )
      .on("playerDestroy", (_player, reason) => {
        if (reason === JOIN_FAILED) return;
        // Auch wenn jemand den Bot aus dem Channel wirft, ist die Jam vorbei.
        void this.exclusive(() => this.endJam()).catch((error) =>
          console.error("Warteschlange konnte nicht geleert werden:", error),
        );
      });

    this.client.on("raw", (data) => {
      void this.manager.sendRawData(data);
    });
    this.client.once("clientReady", (readyClient) => {
      void this.manager
        .init({ id: readyClient.user.id, username: readyClient.user.username })
        .catch((error) =>
          console.error("Lavalink-Start fehlgeschlagen:", error),
        );
    });
  }

  getState() {
    const player = this.getPlayer();
    const current = this.current && {
      title: this.current.title,
      artist: this.current.artist,
      url: this.current.url,
      duration: this.current.duration,
      artworkUrl: this.current.artworkUrl,
      requestedBy: this.current.requestedBy,
    };

    return {
      connected: Boolean(player?.voiceChannelId),
      channelId: player?.voiceChannelId ?? null,
      paused: player?.paused ?? false,
      position: current
        ? Math.min(Math.floor((player?.position ?? 0) / 1000), current.duration)
        : 0,
      current,
      lastFailure: this.lastFailure,
    };
  }

  getQueue() {
    return prisma.musicQueue.findMany({
      orderBy: [...QUEUE_ORDER],
      omit: { encodedTrack: true },
    });
  }

  async join(discordUserId: string) {
    const guild = this.getGuild();
    const channelId = guild.voiceStates.cache.get(discordUserId)?.channelId;
    if (!channelId) throw new MusicError("USER_NOT_IN_VOICE", 409);
    this.getNode();

    return await this.exclusive(async () => {
      const existing = this.getPlayer();
      if (existing) {
        if (existing.voiceChannelId !== channelId) {
          await existing.changeVoiceState({
            voiceChannelId: channelId,
            selfDeaf: true,
          });
        }
        return channelId;
      }

      const player = this.manager.createPlayer({
        guildId: guild.id,
        voiceChannelId: channelId,
        selfDeaf: true,
      });
      await player.connect();
      await this.waitForVoice(player);
      return channelId;
    });
  }

  async leave() {
    await this.exclusive(async () => {
      await this.getPlayer()?.destroy();
      await this.endJam();
    });
  }

  async play() {
    await this.exclusive(async () => {
      const player = this.requirePlayer();
      if (this.current) {
        if (player.paused) await player.resume();
      } else if (!(await this.startNext(player))) {
        throw new MusicError("QUEUE_EMPTY", 409);
      }
      this.autoplay = true;
    });
  }

  async pause() {
    await this.exclusive(async () => {
      const player = this.requirePlayer();
      this.autoplay = false;
      if (this.current && !player.paused) await player.pause();
    });
  }

  async skip() {
    await this.exclusive(async () => {
      const player = this.requirePlayer();
      if (!this.current) throw new MusicError("NOTHING_PLAYING", 409);

      // Beendet den Song. Das folgende "queueEnd" startet den nächsten, auch wenn vorher pausiert war.
      this.autoplay = true;
      await player.stopPlaying(false, false);
    });
  }

  async addSong({
    title,
    url,
    requestedBy,
  }: {
    title?: string;
    url?: string;
    requestedBy: string;
  }) {
    const trimmedUrl = url?.trim();
    const trimmedTitle = title?.trim();
    if (!trimmedUrl && !trimmedTitle) {
      throw new MusicError("SONG_INPUT_REQUIRED", 400);
    }

    const query = trimmedUrl
      ? { query: toYoutubeVideoUrl(trimmedUrl) }
      : { query: trimmedTitle as string, source: "ytsearch" as const };

    const result = await this.getNode()
      .search(query, requestedBy)
      .catch((error: Error) => {
        console.error("Lavalink-Suche fehlgeschlagen:", error.message);
        throw new MusicError("LAVALINK_UNAVAILABLE", 503);
      });

    if (result.loadType === "error") {
      console.error("Song nicht ladbar:", result.exception?.message);
      throw new MusicError("SONG_LOAD_FAILED", 502);
    }
    const track = result.tracks[0];
    if (!track?.encoded) throw new MusicError("SONG_NOT_FOUND", 404);
    if (track.info.isStream) throw new MusicError("SONG_IS_STREAM", 400);

    return await this.exclusive(async () => {
      const { _max } = await prisma.musicQueue.aggregate({
        _max: { position: true },
      });
      const song = await prisma.musicQueue.create({
        data: {
          position: (_max.position ?? -1) + 1,
          title: track.info.title,
          artist: track.info.author,
          url: track.info.uri,
          duration: Math.round(track.info.duration / 1000),
          artworkUrl: track.info.artworkUrl?.startsWith(ARTWORK_URL_PREFIX)
            ? track.info.artworkUrl
            : null,
          encodedTrack: track.encoded as string,
          requestedBy,
        },
        omit: { encodedTrack: true },
      });

      const player = this.getPlayer();
      if (player && this.autoplay && !this.current) {
        await this.startNext(player);
      }
      return song;
    });
  }

  async removeSong(id: number) {
    await this.exclusive(async () => {
      const { count } = await prisma.musicQueue.deleteMany({ where: { id } });
      if (count === 0) throw new MusicError("SONG_NOT_IN_QUEUE", 404);
    });
  }

  // Ohne beforeId rutscht der Song ans Ende der Warteschlange.
  async moveSong(id: number, beforeId: number | null) {
    await this.exclusive(async () => {
      const queue = await prisma.musicQueue.findMany({
        orderBy: [...QUEUE_ORDER],
        select: { id: true },
      });
      const ids = queue.map((song) => song.id);
      if (!ids.includes(id) || (beforeId !== null && !ids.includes(beforeId))) {
        throw new MusicError("SONG_NOT_IN_QUEUE", 404);
      }
      if (id === beforeId) return;

      const reordered = ids.filter((songId) => songId !== id);
      const index =
        beforeId === null ? reordered.length : reordered.indexOf(beforeId);
      reordered.splice(index, 0, id);

      await prisma.$transaction(
        reordered.map((songId, position) =>
          prisma.musicQueue.update({
            where: { id: songId },
            data: { position },
          }),
        ),
      );
    });
  }

  private async onTrackEnded() {
    this.current = null;
    const player = this.getPlayer();
    if (player && this.autoplay) await this.startNext(player);
  }

  private async startNext(player: Player) {
    const next = await prisma.musicQueue.findFirst({
      orderBy: [...QUEUE_ORDER],
    });
    if (!next) return false;

    // Vor dem Start setzen: Ein Fehler kann noch während play() gemeldet werden und braucht den Titel.
    this.current = next;
    try {
      await player.play({
        track: { encoded: next.encodedTrack, requester: next.requestedBy },
        paused: false,
      });
    } catch (error) {
      this.current = null;
      console.error("Song konnte nicht gestartet werden:", error);
      throw new MusicError("LAVALINK_UNAVAILABLE", 503);
    }

    await prisma.musicQueue.delete({ where: { id: next.id } });
    return true;
  }

  private async abortJam() {
    const player = this.getPlayer();
    if (!player) return;

    await player
      .destroy()
      .catch((error) =>
        console.warn("Player nur lokal entfernt:", error.message),
      );
    this.manager.deletePlayer(player.guildId);
    await this.endJam();
  }

  private async endJam() {
    this.current = null;
    this.autoplay = false;
    this.lastFailure = null;
    await prisma.musicQueue.deleteMany();
  }

  private async waitForVoice(player: Player) {
    const deadline = Date.now() + VOICE_READY_TIMEOUT_MS;
    while (!player.connected) {
      if (Date.now() > deadline) {
        await player.destroy(JOIN_FAILED);
        throw new MusicError("VOICE_CONNECT_FAILED", 502);
      }
      await Bun.sleep(VOICE_READY_POLL_MS);
    }
  }

  // Bewegt sich immer nur eine Aktion gleichzeitig durch Player und Warteschlange.
  private exclusive<T>(action: () => Promise<T>): Promise<T> {
    const result = this.lastAction.then(action, action);
    this.lastAction = result.catch(() => undefined);
    return result;
  }

  private getGuild(): Guild {
    const guild = config.guildId
      ? this.client.guilds.cache.get(config.guildId)
      : undefined;
    if (!guild) throw new MusicError("BOT_UNAVAILABLE", 503);
    return guild;
  }

  private getPlayer() {
    return config.guildId ? this.manager.getPlayer(config.guildId) : undefined;
  }

  private requirePlayer() {
    const player = this.getPlayer();
    if (!player?.voiceChannelId) throw new MusicError("BOT_NOT_IN_VOICE", 409);
    return player;
  }

  private getNode() {
    const node = this.manager.nodeManager.nodes.get(NODE_ID);
    if (!node?.connected) throw new MusicError("LAVALINK_UNAVAILABLE", 503);
    return node;
  }
}
