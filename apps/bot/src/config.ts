export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Umgebungsvariable ${name} fehlt in .env`);
  return value;
}

export const config = {
  token: required("DISCORD_TOKEN"),
  clientId: required("DISCORD_CLIENT_ID"),
  guildId: process.env.DISCORD_GUILD_ID || undefined,
  internalHost: process.env.BOT_INTERNAL_HOST || "127.0.0.1",
  internalPort: Number(process.env.BOT_INTERNAL_PORT) || 3002,
  lavalinkHost: process.env.LAVALINK_HOST || "127.0.0.1",
  lavalinkPort: Number(process.env.LAVALINK_PORT) || 2333,
};
