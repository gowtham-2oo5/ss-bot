import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  type ChatInputCommandInteraction,
} from "discord.js";
import { db } from "../../modules/db";
import { endGiveaway } from "./giveaway";

export const data = new SlashCommandBuilder()
  .setName("giveaway-end")
  .setDescription("End an active giveaway early")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  const giveaways = db.query("SELECT * FROM giveaways WHERE ended = 0").all() as any[];

  if (!giveaways.length) {
    await interaction.reply({ content: "No active giveaways.", flags: 64 });
    return;
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId("gw_end_select")
    .setPlaceholder("Select a giveaway to end")
    .addOptions(giveaways.map((g) => ({
      label: g.prize.slice(0, 100),
      description: `Ends <t:${Math.floor(g.ends_at / 1000)}:R>`,
      value: g.message_id,
    })));

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  const response = await interaction.reply({ content: "Select a giveaway to end:", components: [row], flags: 64, withResponse: true });
  const reply = response.resource!.message!;

  const collector = reply.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 30_000 });

  collector.on("collect", async (i) => {
    await endGiveaway(i.values[0], interaction.client);
    await i.update({ content: "✅ Giveaway ended.", components: [] });
    collector.stop();
  });

  collector.on("end", (_, reason) => {
    if (reason === "time") reply.edit({ content: "Timed out.", components: [] }).catch(() => {});
  });
}
