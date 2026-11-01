import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../../types.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Antwortet mit Pong und der Latenz."),
  async execute(interaction) {
    const sent = await interaction.reply({ content: "Pong!", withResponse: true });
    const latency =
      (sent.resource?.message?.createdTimestamp ?? Date.now()) -
      interaction.createdTimestamp;
    await interaction.editReply(
      `Pong! 🏓 Latenz: ${latency}ms · API: ${interaction.client.ws.ping}ms`,
    );
  },
} satisfies Command;
