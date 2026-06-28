import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, type ChatInputCommandInteraction } from "discord.js";
import { setConfig } from "../../modules/db";

export const data = new SlashCommandBuilder()
  .setName("set-giveaway-channel")
  .setDescription("Set the channel for giveaways")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addChannelOption((o) => o.setName("channel").setDescription("Giveaway channel").addChannelTypes(ChannelType.GuildText).setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("channel", true);
  setConfig("giveaway_channel", channel.id);

  await interaction.reply({
    embeds: [new EmbedBuilder().setTitle("✅ Giveaway Channel Set").setColor(0x5865f2).setDescription(`Giveaways will be posted in <#${channel.id}>`).setTimestamp()],
  });
}
