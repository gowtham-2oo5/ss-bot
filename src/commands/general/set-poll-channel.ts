import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, type ChatInputCommandInteraction } from "discord.js";
import { setConfig } from "../../modules/db";

export const data = new SlashCommandBuilder()
  .setName("set-poll-channel")
  .setDescription("Set the channel for polls")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addChannelOption((o) => o.setName("channel").setDescription("Poll channel").addChannelTypes(ChannelType.GuildText).setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("channel", true);
  setConfig("poll_channel", channel.id);

  await interaction.reply({
    embeds: [new EmbedBuilder().setTitle("📊 Poll Channel Set").setColor(0x5865f2).setDescription(`Polls will be sent to <#${channel.id}>`).setTimestamp()],
  });
}
