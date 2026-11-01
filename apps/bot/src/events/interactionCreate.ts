import { Events, MessageFlags } from "discord.js";
import type { Event } from "../types.ts";

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      console.error(`Unbekannter Command: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      const reply = {
        content: "Beim Ausführen des Commands ist ein Fehler aufgetreten.",
        flags: MessageFlags.Ephemeral,
      } as const;
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  },
} satisfies Event<Events.InteractionCreate>;
