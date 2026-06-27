import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, type ChatInputCommandInteraction } from "discord.js";
import { setConfig } from "../../modules/db";

export const data = new SlashCommandBuilder()
  .setName("set-reaction-roles-channel")
  .setDescription("Set the channel for reaction role panels")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addChannelOption((o) => o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText).setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("channel", true);
  setConfig("reaction_roles_channel", channel.id);

  await interaction.reply({
    embeds: [new EmbedBuilder().setTitle("✅ Reaction Roles Channel Set").setColor(0x5865f2).setDescription(`Panels will be posted in <#${channel.id}>`).setTimestamp()],
  });
}
