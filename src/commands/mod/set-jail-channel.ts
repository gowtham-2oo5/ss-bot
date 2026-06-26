import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, type ChatInputCommandInteraction } from "discord.js";
import { setConfig } from "../../modules/db";

export const data = new SlashCommandBuilder()
  .setName("set-jail-channel")
  .setDescription("Set the jail channel for this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addChannelOption((o) => o.setName("channel").setDescription("The jail channel").addChannelTypes(ChannelType.GuildText).setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("channel", true);
  setConfig("jail_channel", channel.id);

  await interaction.reply({
    embeds: [new EmbedBuilder().setTitle("🔒 Jail Channel Set").setColor(0x5865f2).setDescription(`Jail channel set to <#${channel.id}>`).setTimestamp()],
  });
}
