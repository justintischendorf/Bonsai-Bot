import { createLogger } from "@repo/logger";

import type { DiscordGuild, DiscordMember } from "./model";

const logger = createLogger("api:server");

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

export abstract class ServerService {
  static async getServer() {
    const guild = await discord<DiscordGuild>("?with_counts=true");

    return {
      id: guild.id,
      name: guild.name,
      iconUrl: guild.icon && `${CDN}/icons/${guild.id}/${guild.icon}.png`,
      memberCount: guild.approximate_member_count,
      onlineCount: guild.approximate_presence_count,
    };
  }

  static async getMembers() {
    const members = await discord<DiscordMember[]>("/members?limit=1000");

    return members
      .filter(({ user }) => !user.bot)
      .map(({ user, nick, roles, joined_at }) => ({
        id: user.id,
        name: nick ?? user.global_name ?? user.username,
        username: user.username,
        avatarUrl:
          user.avatar && `${CDN}/avatars/${user.id}/${user.avatar}.png`,
        roles,
        joinedAt: joined_at,
      }));
  }
}
