import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("create-role")
  .setDescription("Create a new role")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addStringOption((o) => o.setName("name").setDescription("Role name").setRequired(true))
  .addStringOption((o) => o.setName("color").setDescription("Hex color (e.g. #ff5733)"))
  .addRoleOption((o) => o.setName("clone-from").setDescription("Clone permissions from this role"))
  .addRoleOption((o) => o.setName("below").setDescription("Position below this role"));

export async function execute(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString("name", true);
  const color = interaction.options.getString("color");
  const cloneFrom = interaction.options.getRole("clone-from");
  const below = interaction.options.getRole("below");

  const guild = interaction.guild!;
  const permissions = cloneFrom ? (guild.roles.cache.get(cloneFrom.id)?.permissions) : undefined;

  const role = await guild.roles.create({
    name,
    color: color ? parseInt(color.replace("#", ""), 16) : undefined,
    permissions: permissions ?? undefined,
    reason: `Created by ${interaction.user.username} via Shadow Seneschal`,
  });

  if (below) {
    const belowRole = guild.roles.cache.get(below.id);
    if (belowRole) await role.setPosition(belowRole.position - 1).catch(() => {});
  }

  await interaction.reply({
    embeds: [new EmbedBuilder().setTitle("✅ Role Created").setColor(role.color || 0x5865f2).addFields(
      { name: "Name", value: role.name, inline: true },
      { name: "Color", value: color ?? "Default", inline: true },
      { name: "Cloned From", value: cloneFrom?.name ?? "None", inline: true },
    ).setTimestamp()],
  });
}
