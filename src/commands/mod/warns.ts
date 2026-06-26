import {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    type ChatInputCommandInteraction,
} from "discord.js";
import { getWarns } from "../../modules/warns";

export const data = new SlashCommandBuilder()
    .setName("warns")
    .setDescription("View warns for a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addUserOption((o) =>
        o.setName("user").setDescription("User to check").setRequired(true),
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("user", true);
    const warns = getWarns(target.id);

    if (!warns.length) {
        await interaction.reply({
            content: `✅ <@${target.id}> has no warns.`,
            flags: 64,
        });
        return;
    }

    const list = warns
        .map(
            (w, i) =>
                `${i + 1}. \`${w.id}\` — ${w.reason} (<t:${Math.floor(w.timestamp / 1000)}:R>)`,
        )
        .join("\n");

    const embed = new EmbedBuilder()
        .setTitle(`📋 Warns for ${target.username}`)
        .setDescription(list)
        .setColor(0xfee75c)
        .setFooter({ text: `Total: ${warns.length} warn(s)` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
