import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  type ChatInputCommandInteraction,
} from "discord.js";
import { db } from "../../modules/db";
import { closePoll } from "./poll";

export const data = new SlashCommandBuilder()
  .setName("poll-end")
  .setDescription("End an active poll")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  const polls = db.query("SELECT * FROM polls").all() as any[];

  if (!polls.length) {
    await interaction.reply({ content: "No active polls.", flags: 64 });
    return;
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId("poll_end_select")
    .setPlaceholder("Select a poll to end")
    .addOptions(polls.map((p) => ({
      label: p.question.slice(0, 100),
      description: `ID: ${p.message_id}`,
      value: p.message_id,
    })));

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  const response = await interaction.reply({ content: "Select a poll to end:", components: [row], withResponse: true });
  const reply = response.resource!.message!;

  const collector = reply.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 30_000 });

  collector.on("collect", async (i) => {
    await closePoll(i.values[0], interaction.client);
    await i.update({ content: "✅ Poll ended.", components: [] });
    collector.stop();
  });

  collector.on("end", (_, reason) => {
    if (reason === "time") reply.edit({ content: "Timed out.", components: [] }).catch(() => {});
  });
}
