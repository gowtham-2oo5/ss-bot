import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";

const DURATIONS: Record<string, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "6h": 21_600_000,
  "1d": 86_400_000,
  "1w": 604_800_000,
};

export const data = new SlashCommandBuilder()
  .setName("timeout")
  .setDescription("Timeout a user")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addUserOption((o) => o.setName("user").setDescription("User to timeout").setRequired(true))
  .addStringOption((o) =>
    o.setName("duration").setDescription("Duration").setRequired(true)
      .addChoices(...Object.keys(DURATIONS).map((k) => ({ name: k, value: k })))
  )
  .addStringOption((o) => o.setName("reason").setDescription("Reason"));

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getMember("user") as any;
  if (!target) { await interaction.reply({ content: "User not found in server.", flags: 64 }); return; }
  const duration = interaction.options.getString("duration", true);
  const reason = interaction.options.getString("reason") ?? "No reason provided";
  const ms = DURATIONS[duration];

  await target.timeout(ms, reason);

  await target.send({
    embeds: [new EmbedBuilder().setTitle(`⏱️ You were timed out in ${interaction.guild!.name}`).setColor(0xf0b232).addFields(
      { name: "Duration", value: duration, inline: true },
      { name: "Reason", value: reason },
    ).setTimestamp()],
  }).catch(() => {});

  await interaction.reply({
    embeds: [new EmbedBuilder().setTitle("⏱️ User Timed Out").setColor(0xf0b232).addFields(
      { name: "User", value: `<@${target.id}>`, inline: true },
      { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Duration", value: duration, inline: true },
      { name: "Reason", value: reason },
    ).setTimestamp()],
  });
}
