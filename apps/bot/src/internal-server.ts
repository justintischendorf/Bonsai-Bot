import type { Client } from "discord.js";

import { config, required } from "./config.ts";
import { MusicError, type MusicPlayer } from "./music.ts";

// Nur für die API gedacht: nie öffentlich freigeben, alle Routen außer /health verlangen das gemeinsame Secret.
export function startInternalServer(client: Client, music: MusicPlayer) {
  const secret = required("BOT_INTERNAL_SECRET");

  const route =
    <R extends Request>(action: (request: R) => unknown, successStatus = 200) =>
    async (request: R) => {
      if (request.headers.get("x-internal-secret") !== secret) {
        return new Response(null, { status: 401 });
      }

      try {
        const result = await action(request);
        return result === undefined
          ? new Response(null, { status: 204 })
          : Response.json(result, { status: successStatus });
      } catch (error) {
        if (error instanceof MusicError) {
          return Response.json(
            { error: error.message },
            { status: error.status },
          );
        }
        console.error("Musik-Anfrage fehlgeschlagen:", error);
        return new Response(null, { status: 500 });
      }
    };

  return Bun.serve({
    hostname: config.internalHost,
    port: config.internalPort,
    routes: {
      "/health": () =>
        new Response(null, { status: client.isReady() ? 200 : 503 }),
      "/voice/join": {
        POST: route(async (request) => {
          const body = (await request.json().catch(() => null)) as {
            discordUserId?: unknown;
          } | null;
          if (typeof body?.discordUserId !== "string") {
            throw new MusicError("INVALID_REQUEST", 400);
          }
          return { channelId: await music.join(body.discordUserId) };
        }),
      },
      "/voice/leave": { POST: route(() => music.leave()) },
      "/music/state": {
        GET: route(async () => ({
          ...music.getState(),
          queue: await music.getQueue(),
        })),
      },
      "/music/play": { POST: route(() => music.play()) },
      "/music/stop": { POST: route(() => music.pause()) },
      "/music/skip": { POST: route(() => music.skip()) },
      "/music/songs": {
        POST: route(async (request) => {
          const body = (await request.json().catch(() => null)) as {
            title?: unknown;
            url?: unknown;
            requestedBy?: unknown;
          } | null;
          if (typeof body?.requestedBy !== "string") {
            throw new MusicError("INVALID_REQUEST", 400);
          }
          return await music.addSong({
            title: typeof body.title === "string" ? body.title : undefined,
            url: typeof body.url === "string" ? body.url : undefined,
            requestedBy: body.requestedBy,
          });
        }, 201),
      },
      "/music/songs/:id": {
        DELETE: route((request) => {
          const id = Number(request.params.id);
          if (!Number.isInteger(id)) {
            throw new MusicError("INVALID_REQUEST", 400);
          }
          return music.removeSong(id);
        }),
      },
      "/music/songs/:id/move": {
        POST: route(async (request) => {
          const id = Number(request.params.id);
          const body = (await request.json().catch(() => null)) as {
            beforeId?: unknown;
          } | null;
          const beforeId = body?.beforeId;
          if (
            !Number.isInteger(id) ||
            (beforeId !== null && !Number.isInteger(beforeId))
          ) {
            throw new MusicError("INVALID_REQUEST", 400);
          }
          return music.moveSong(id, beforeId as number | null);
        }),
      },
    },
  });
}
