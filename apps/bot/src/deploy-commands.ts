import { REST, Routes } from "discord.js";
import { config } from "./config.ts";
import { loadCommands } from "./loader.ts";

const commands = (await loadCommands()).map((c) => c.data.toJSON());
const rest = new REST().setToken(config.token);

const route = config.guildId
  ? Routes.applicationGuildCommands(config.clientId, config.guildId)
  : Routes.applicationCommands(config.clientId);

console.log(`Registriere ${commands.length} Slash-Command(s)...`);
await rest.put(route, { body: commands });
console.log("Fertig.");
