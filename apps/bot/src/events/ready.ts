import { Events } from "discord.js";
import type { Event } from "../types.ts";

export default {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Eingeloggt als ${client.user.tag}`);
  },
} satisfies Event<Events.ClientReady>;
