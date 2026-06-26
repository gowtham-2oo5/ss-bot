import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, type ChatInputCommandInteraction } from "discord.js";
import { getConfig, setConfig } from "../../modules/db";

async function getOrCreateJailRole(guild: any, jailChannelId: string) {
  let role = guild.roles.cache.find((r: any) => r.name === "Jailed");
  if (role) return role;

  role = await guild.roles.create({
    name: "Jailed",
    colors: 0x2c2f33,
    permissions: [],
    reason: "Auto-created jail role by Shadow Seneschal",
  });

  for (const channel of guild.channels.cache.values()) {
    if (channel.type === ChannelType.GuildCategory || channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice) {
      if (channel.id === jailChannelId) {
        await channel.permissionOverwrites.edit(role, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
      } else {
        await channel.permissionOverwrites.edit(role, { ViewChannel: false, SendMessages: false });
      }
    }
  }

  return role;
}

export const data = new SlashCommandBuilder()
  .setName("jail")
  .setDescription("Jail a user (restrict to jail channel only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addUserOption((o) => o.setName("user").setDescription("User to jail").setRequired(true))
  .addStringOption((o) => o.setName("reason").setDescription("Reason"));

export async function execute(interaction: ChatInputCommandInteraction) {
  const jailChannelId = getConfig("jail_channel");
  if (!jailChannelId) {
    await interaction.reply({ content: "Jail channel not set. Use `/set-jail-channel` first.", flags: 64 });
    return;
  }

  const target = interaction.options.getMember("user") as any;
  if (!target) { await interaction.reply({ content: "User not found in server.", flags: 64 }); return; }
  const reason = interaction.options.getString("reason") ?? "No reason provided";

  await interaction.deferReply();

  const role = await getOrCreateJailRole(interaction.guild!, jailChannelId);

  // Strip all existing roles (except @everyone) and store them
  const existingRoles = target.roles.cache.filter((r: any) => r.id !== interaction.guild!.id);
  const roleIds = existingRoles.map((r: any) => r.id);
  const roleMentions = existingRoles.map((r: any) => `<@&${r.id}>`).join(", ") || "None";

  // Save roles to DB for unjail restore
  setConfig(`jail_roles_${target.id}`, JSON.stringify(roleIds));

  await target.roles.remove(roleIds, "Jailed — roles stripped");
  await target.roles.add(role, reason);

  // Log in jail channel
  const jailChannel = interaction.guild!.channels.cache.get(jailChannelId);
  if (jailChannel?.isTextBased()) {
    await (jailChannel as any).send({
      embeds: [new EmbedBuilder().setTitle("🔒 User Jailed").setColor(0x23272a).addFields(
        { name: "User", value: `<@${target.id}>` },
        { name: "Removed Roles", value: roleMentions },
        { name: "Reason", value: reason },
      ).setTimestamp()],
    });
  }

  await target.send({
    embeds: [new EmbedBuilder().setTitle(`🔒 You were jailed in ${interaction.guild!.name}`).setColor(0x23272a).addFields(
      { name: "Reason", value: reason },
      { name: "Channel", value: `<#${jailChannelId}>` },
    ).setTimestamp()],
  }).catch(() => {});

  await interaction.editReply({
    embeds: [new EmbedBuilder().setTitle("🔒 User Jailed").setColor(0x23272a).addFields(
      { name: "User", value: `<@${target.id}>`, inline: true },
      { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Channel", value: `<#${jailChannelId}>`, inline: true },
      { name: "Removed Roles", value: roleMentions },
      { name: "Reason", value: reason },
    ).setTimestamp()],
  });
}
