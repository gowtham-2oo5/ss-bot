import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import { setConfig } from "../../modules/db";

const ALLOWED_PREFIXES = /^[!@#$%^&*~;:.,?\\/<>|\-+=]+$/;

export const data = new SlashCommandBuilder()
  .setName("set-prefix")
  .setDescription("Set the bot prefix for text commands")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addStringOption((o) => o.setName("prefix").setDescription("Prefix (special characters only)").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const prefix = interaction.options.getString("prefix", true);

  if (!ALLOWED_PREFIXES.test(prefix)) {
    await interaction.reply({ content: "Invalid prefix. Use special characters only: `! @ # $ % ^ & * ~ ; : . , ? \\ / < > | - + =`", flags: 64 });
    return;
  }

  setConfig("prefix", prefix);

  await interaction.reply({
    embeds: [new EmbedBuilder().setTitle("✅ Prefix Set").setColor(0x5865f2).setDescription(`Bot prefix is now \`${prefix}\``).setTimestamp()],
  });
}
