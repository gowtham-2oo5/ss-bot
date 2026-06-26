import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("kick")
  .setDescription("Kick a user")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addUserOption((o) => o.setName("user").setDescription("User to kick").setRequired(true))
  .addStringOption((o) => o.setName("reason").setDescription("Reason"));

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getMember("user") as any;
  if (!target) { await interaction.reply({ content: "User not found in server.", flags: 64 }); return; }
  const reason = interaction.options.getString("reason") ?? "No reason provided";

  await target.send({
    embeds: [new EmbedBuilder().setTitle(`👢 You were kicked from ${interaction.guild!.name}`).setColor(0xed4245).addFields({ name: "Reason", value: reason }).setTimestamp()],
  }).catch(() => {});

  await target.kick(reason);

  await interaction.reply({
    embeds: [new EmbedBuilder().setTitle("👢 User Kicked").setColor(0xed4245).addFields(
      { name: "User", value: `<@${target.id}>`, inline: true },
      { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Reason", value: reason },
    ).setTimestamp()],
  });
}
