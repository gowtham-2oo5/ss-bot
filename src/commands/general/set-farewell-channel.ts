import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, type ChatInputCommandInteraction } from "discord.js";
import { setConfig } from "../../modules/db";

export const data = new SlashCommandBuilder()
  .setName("set-farewell-channel")
  .setDescription("Set the channel for farewell messages")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addChannelOption((o) => o.setName("channel").setDescription("Farewell channel").addChannelTypes(ChannelType.GuildText).setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("channel", true);
  setConfig("farewell_channel", channel.id);

  await interaction.reply({
    embeds: [new EmbedBuilder().setTitle("✅ Farewell Channel Set").setColor(0x5865f2).setDescription(`Farewell messages will be sent to <#${channel.id}>`).setTimestamp()],
  });
}
