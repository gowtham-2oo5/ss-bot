import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  type ChatInputCommandInteraction,
} from "discord.js";
import { db } from "../../modules/db";
import { rerollGiveaway } from "./giveaway";

export const data = new SlashCommandBuilder()
  .setName("giveaway-reroll")
  .setDescription("Reroll a winner for an ended giveaway")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  const giveaways = db.query("SELECT * FROM giveaways WHERE ended = 1").all() as any[];

  if (!giveaways.length) {
    await interaction.reply({ content: "No ended giveaways to reroll.", flags: 64 });
    return;
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId("gw_reroll_select")
    .setPlaceholder("Select a giveaway to reroll")
    .addOptions(giveaways.slice(0, 25).map((g) => ({
      label: g.prize.slice(0, 100),
      value: g.message_id,
    })));

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  const response = await interaction.reply({ content: "Select a giveaway to reroll:", components: [row], flags: 64, withResponse: true });
  const reply = response.resource!.message!;

  const collector = reply.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 30_000 });

  collector.on("collect", async (i) => {
    const winner = await rerollGiveaway(i.values[0], interaction.client);
    await i.update({ content: winner ? "✅ Rerolled!" : "No valid entries to reroll.", components: [] });
    collector.stop();
  });

  collector.on("end", (_, reason) => {
    if (reason === "time") reply.edit({ content: "Timed out.", components: [] }).catch(() => {});
  });
}
