import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  type ChatInputCommandInteraction,
  type StringSelectMenuInteraction,
  ComponentType,
} from "discord.js";

const ROLE_IDS = (process.env.MAIN_ROLES ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export const data = new SlashCommandBuilder()
  .setName("roles")
  .setDescription("Browse members by role")
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  const guild = interaction.client.guilds.cache.get(interaction.guildId!);
  if (!guild) {
    await interaction.reply({ content: "Could not resolve this server.", flags: 64 });
    return;
  }

  const roles = ROLE_IDS.map((id) => guild.roles.cache.get(id)).filter(Boolean);
  if (!roles.length) {
    await interaction.reply({ content: "No valid roles configured.", flags: 64 });
    return;
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId("role_select")
    .setPlaceholder("Select a role")
    .addOptions(roles.map((r) => ({ label: r!.name, value: r!.id })));

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

  const embed = buildEmbed(roles[0]!);

  const response = await interaction.reply({
    embeds: [embed],
    components: [row],
    withResponse: true,
  });
  const reply = response.resource!.message!;

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 120_000,
  });

  collector.on("collect", async (i: StringSelectMenuInteraction) => {
    const role = guild.roles.cache.get(i.values[0]);
    if (!role) return;
    await i.update({ embeds: [buildEmbed(role)], components: [row] });
  });

  collector.on("end", async () => {
    const disabledMenu = StringSelectMenuBuilder.from(menu).setDisabled(true);
    const disabledRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(disabledMenu);
    await reply.edit({ components: [disabledRow] }).catch(() => {});
  });
}

function buildEmbed(role: any) {
  const members = role.members.map((m: any) => m);
  const list = members.length
    ? members.slice(0, 25).map((m: any) => `<@${m.id}>`).join("\n")
    : "*No members with this role*";

  return new EmbedBuilder()
    .setTitle(`${role.name}`)
    .setDescription(list)
    .setColor(role.color || 0x5865f2)
    .setFooter({ text: `${members.length} member${members.length !== 1 ? "s" : ""} • Shadow Seneschal` })
    .setTimestamp();
}
