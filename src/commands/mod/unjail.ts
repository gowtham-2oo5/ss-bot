import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("unjail")
  .setDescription("Remove a user from jail")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addUserOption((o) => o.setName("user").setDescription("User to unjail").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getMember(interaction.options.getUser("user", true).id) as any;
  if (!target) { await interaction.reply({ content: "User not found in server.", ephemeral: true }); return; }

  const role = interaction.guild!.roles.cache.find((r) => r.name === "Jailed");
  if (!role) { await interaction.reply({ content: "No jail role found.", ephemeral: true }); return; }

  await target.roles.remove(role);

  await target.send({
    embeds: [new EmbedBuilder().setTitle(`🔓 You were released from jail in ${interaction.guild!.name}`).setColor(0x57f287).setTimestamp()],
  }).catch(() => {});

  await interaction.reply({
    embeds: [new EmbedBuilder().setTitle("🔓 User Released").setColor(0x57f287).addFields(
      { name: "User", value: `<@${target.id}>`, inline: true },
      { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
    ).setTimestamp()],
  });
}
