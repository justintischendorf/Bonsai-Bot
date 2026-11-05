import { SlashCommandBuilder } from "discord.js";

import { required } from "../../config.ts";
import type { Command } from "../../types.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("link")
    .setDescription("Schickt den Link zur Bonsai-Bot-Website in den Channel."),
  async execute(interaction) {
    await interaction.reply(
      `🌱 Hier geht's zur Website: ${required("WEB_SERVER_URL")}`,
    );
  },
} satisfies Command;
