import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import { getConfig, setConfig } from "../../modules/db";

export const data = new SlashCommandBuilder()
  .setName("unjail")
  .setDescription("Remove a user from jail and restore roles")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addUserOption((o) => o.setName("user").setDescription("User to unjail").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getMember("user") as any;
  if (!target) { await interaction.reply({ content: "User not found in server.", flags: 64 }); return; }

  const role = interaction.guild!.roles.cache.find((r) => r.name === "Jailed");
  if (!role) { await interaction.reply({ content: "No jail role found.", flags: 64 }); return; }

  await interaction.deferReply();

  // Remove jail role
  await target.roles.remove(role);

  // Restore saved roles
  const savedRoles = getConfig(`jail_roles_${target.id}`);
  if (savedRoles) {
    const roleIds: string[] = JSON.parse(savedRoles);
    await target.roles.add(roleIds, "Unjailed — roles restored").catch(() => {});
    setConfig(`jail_roles_${target.id}`, "");
  }

  await target.send({
    embeds: [new EmbedBuilder().setTitle(`🔓 You were released from jail in ${interaction.guild!.name}`).setColor(0x57f287).setTimestamp()],
  }).catch(() => {});

  await interaction.editReply({
    embeds: [new EmbedBuilder().setTitle("🔓 User Released").setColor(0x57f287).addFields(
      { name: "User", value: `<@${target.id}>`, inline: true },
      { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Roles Restored", value: savedRoles ? "✅ Yes" : "⚠️ None saved" },
    ).setTimestamp()],
  });
}
