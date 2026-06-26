import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, type ChatInputCommandInteraction } from "discord.js";
import { setConfig } from "../../modules/db";

export const data = new SlashCommandBuilder()
  .setName("set-welcome-channel")
  .setDescription("Set the welcome message channel")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addChannelOption((o) => o.setName("channel").setDescription("Welcome channel").addChannelTypes(ChannelType.GuildText).setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("channel", true);
  setConfig("welcome_channel", channel.id);

  await interaction.reply({
    embeds: [new EmbedBuilder().setTitle("✅ Welcome Channel Set").setColor(0x5865f2).setDescription(`Welcome messages will be sent to <#${channel.id}>`).setTimestamp()],
  });
}
