import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import { addWarn } from "../../modules/warns";

export const data = new SlashCommandBuilder()
  .setName("warn")
  .setDescription("Warn a user")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addUserOption((o) => o.setName("user").setDescription("User to warn").setRequired(true))
  .addStringOption((o) => o.setName("reason").setDescription("Reason for warning").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason", true);
  const warn = addWarn(target.id, interaction.user.id, reason);

  const embed = new EmbedBuilder()
    .setTitle("⚠️ User Warned")
    .setColor(0xfee75c)
    .addFields(
      { name: "User", value: `<@${target.id}>`, inline: true },
      { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Reason", value: reason },
      { name: "Warn ID", value: `\`${warn.id}\``, inline: true },
    )
    .setTimestamp();

  await target.send({
    embeds: [new EmbedBuilder()
      .setTitle(`⚠️ You were warned in ${interaction.guild!.name}`)
      .setColor(0xfee75c)
      .addFields(
        { name: "Reason", value: reason },
        { name: "Warned by", value: `<@${interaction.user.id}>` },
        { name: "Mistaken?", value: "Contact the owner: `first_knight780` on Discord" },
      )
      .setTimestamp()],
  }).catch(() => {});

  await interaction.reply({ embeds: [embed] });
}
