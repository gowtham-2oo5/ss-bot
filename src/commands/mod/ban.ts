import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ban")
  .setDescription("Ban a user")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addUserOption((o) => o.setName("user").setDescription("User to ban").setRequired(true))
  .addStringOption((o) => o.setName("reason").setDescription("Reason"));

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") ?? "No reason provided";

  await target.send({
    embeds: [new EmbedBuilder().setTitle(`🔨 You were banned from ${interaction.guild!.name}`).setColor(0xed4245).addFields({ name: "Reason", value: reason }).setTimestamp()],
  }).catch(() => {});

  await interaction.guild!.members.ban(target, { reason });

  await interaction.reply({
    embeds: [new EmbedBuilder().setTitle("🔨 User Banned").setColor(0xed4245).addFields(
      { name: "User", value: `<@${target.id}>`, inline: true },
      { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Reason", value: reason },
    ).setTimestamp()],
  });
}
