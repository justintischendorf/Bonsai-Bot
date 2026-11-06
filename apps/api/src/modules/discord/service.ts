import {
  ActivityType,
  Client,
  GatewayIntentBits,
  type PresenceStatus,
} from "discord.js";

import { createLogger } from "@repo/logger";

import type { DiscordModel } from "./model";

const logger = createLogger("api:discord");

const GUILD_URL = `https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}`;
const CDN = "https://cdn.discordapp.com";

async function discord<T>(path: string): Promise<T> {
  const res = await fetch(GUILD_URL + path, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
  });

  if (!res.ok) {
    logger.error(`discord request failed: ${path} status=${res.status}`);
    throw new Error("DISCORD_REQUEST_FAILED");
  }
  return res.json() as Promise<T>;
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences],
  ws: { large_threshold: 250 },
});

client.on("error", (error) => {
  logger.error(`discord gateway error: ${error.message}`);
});

client.login(process.env.DISCORD_BOT_TOKEN).catch((error: Error) => {
  logger.error(`discord gateway login failed: ${error.message}`);
});

function getPresenceReader(): (userId: string) => {
  status: PresenceStatus;
  game: string | null;
} {
  const guild = client.isReady()
    ? client.guilds.cache.get(process.env.DISCORD_GUILD_ID ?? "")
    : undefined;

  if (!guild?.available) throw new Error("PRESENCE_UNAVAILABLE");

  return (userId) => {
    const presence = guild.presences.cache.get(userId);

    return {
      status: presence?.status ?? "offline",
      game:
        presence?.activities.find(({ type }) => type === ActivityType.Playing)
          ?.name ?? null,
    };
  };
}

function getAvatarUrl({ id, avatar }: DiscordModel["Member"]["user"]) {
  return avatar
    ? `${CDN}/avatars/${id}/${avatar}.png`
    : `${CDN}/embed/avatars/${(BigInt(id) >> BigInt(22)) % BigInt(6)}.png`;
}

const DEV_MEMBER_COUNT = 14;

const DEV_MEMBER_PRESETS: { status: PresenceStatus; game: string | null }[] = [
  { status: "online", game: "Minecraft" },
  { status: "idle", game: null },
  { status: "dnd", game: "Counter-Strike 2" },
  { status: "online", game: null },
  { status: "offline", game: null },
];

function withDevMembers<T extends { id: string }>(
  members: T[],
  createMember: (index: number) => T,
) {
  if (process.env.NODE_ENV === "production") return members;

  const missing = Math.max(DEV_MEMBER_COUNT - members.length, 0);
  return [
    ...members,
    ...Array.from({ length: missing }, (_, index) => createMember(index)),
  ];
}

export abstract class DiscordService {
  static async sendChannelMessage(channelId: string, content: string) {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        // Der Text enthält fremde Daten wie Spielnamen, die niemanden anpingen dürfen.
        body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
      },
    );

    if (!res.ok) {
      logger.error(`discord message failed: status=${res.status}`);
      throw new Error("DISCORD_REQUEST_FAILED");
    }
  }

  static async getServer() {
    const guild = await discord<DiscordModel["Guild"]>("?with_counts=true");

    return {
      id: guild.id,
      name: guild.name,
      iconUrl: guild.icon && `${CDN}/icons/${guild.id}/${guild.icon}.png`,
      memberCount: guild.approximate_member_count,
      onlineCount: guild.approximate_presence_count,
    };
  }

  static async getMembers() {
    const getPresence = getPresenceReader();
    const [members, guildRoles] = await Promise.all([
      discord<DiscordModel["Member"][]>("/members?limit=1000"),
      discord<DiscordModel["Role"][]>("/roles"),
    ]);
    const rolesByRank = guildRoles.sort((a, b) => b.position - a.position);

    const realMembers = members
      .filter(({ user }) => !user.bot)
      .map(({ user, nick, roles, joined_at }) => {
        const { status, game } = getPresence(user.id);

        return {
          id: user.id,
          name: nick ?? user.global_name ?? user.username,
          username: user.username,
          avatarUrl: getAvatarUrl(user),
          status,
          online: status !== "offline",
          game,
          roles: rolesByRank
            .filter((role) => roles.includes(role.id))
            .map(({ id, name }) => ({ id, name })),
          joinedAt: joined_at,
        };
      });

    return withDevMembers(realMembers, (index) => {
      const { status, game } =
        DEV_MEMBER_PRESETS[index % DEV_MEMBER_PRESETS.length]!;
      const id = `1000000000000000${String(index).padStart(3, "0")}`;

      return {
        id,
        name: `Testmitglied ${index + 1}`,
        username: `testmitglied${index + 1}`,
        avatarUrl: getAvatarUrl({
          id,
          username: `testmitglied${index + 1}`,
          global_name: null,
          avatar: null,
        }),
        status,
        online: status !== "offline",
        game,
        roles: [],
        joinedAt: new Date(0).toISOString(),
      };
    });
  }
}
