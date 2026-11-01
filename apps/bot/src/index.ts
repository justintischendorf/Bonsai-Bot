import { Client, Collection, GatewayIntentBits } from "discord.js";
import { config } from "./config.ts";
import { loadCommands, loadEvents } from "./loader.ts";
import type { Command } from "./types.ts";

declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
  }
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
for (const command of await loadCommands()) {
  client.commands.set(command.data.name, command);
}

for (const event of await loadEvents()) {
  const handler = (...args: unknown[]) =>
    (event.execute as (...a: unknown[]) => unknown)(...args);
  if (event.once) client.once(event.name, handler);
  else client.on(event.name, handler);
}

await client.login(config.token);
