import {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ComponentType,
    type ChatInputCommandInteraction,
} from "discord.js";
import { getWarns, deleteWarn, deleteAllWarns } from "../../modules/warns";

export const data = new SlashCommandBuilder()
    .setName("delwarn")
    .setDescription("Delete warns for a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addUserOption((o) =>
        o.setName("user").setDescription("User").setRequired(true),
    )
    .addBooleanOption((o) =>
        o.setName("all").setDescription("Delete all warns"),
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("user", true);
    const all = interaction.options.getBoolean("all") ?? false;

    if (all) {
        const count = deleteAllWarns(target.id);
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🗑️ Warns Cleared")
                    .setColor(0x57f287)
                    .setDescription(
                        `Removed **${count}** warn(s) from <@${target.id}>.`,
                    ),
            ],
        });
        return;
    }

    const warns = getWarns(target.id);
    if (!warns.length) {
        await interaction.reply({
            content: `✅ <@${target.id}> has no warns.`,
            ephemeral: true,
        });
        return;
    }

    const menu = new StringSelectMenuBuilder()
        .setCustomId("delwarn_select")
        .setPlaceholder("Select warn(s) to delete")
        .setMinValues(1)
        .setMaxValues(warns.length)
        .addOptions(
            warns.map((w, i) => ({
                label: `#${i + 1} — ${w.reason.slice(0, 80)}`,
                description: new Date(w.timestamp).toLocaleDateString(),
                value: w.id,
            })),
        );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        menu,
    );
    const response = await interaction.reply({
        content: "Select warn(s) to delete:",
        components: [row],
        withResponse: true,
    });
    const reply = response.resource!.message!;

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 30_000,
    });

    collector.on("collect", async (i) => {
        let removed = 0;
        for (const id of i.values) {
            if (deleteWarn(target.id, id)) removed++;
        }
        await i.update({
            content: `🗑️ Removed **${removed}** warn(s) from <@${target.id}>.`,
            components: [],
        });
        collector.stop();
    });

    collector.on("end", (_, reason) => {
        if (reason === "time")
            reply
                .edit({ content: "Timed out.", components: [] })
                .catch(() => {});
    });
}
