import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    type ChatInputCommandInteraction,
} from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete multiple messages")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addIntegerOption((o) =>
        o
            .setName("count")
            .setDescription("Number of messages to delete (1-100)")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100),
    )
    .addUserOption((o) =>
        o.setName("user").setDescription("Only delete messages from this user"),
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const count = interaction.options.getInteger("count", true);
    const user = interaction.options.getUser("user");

    await interaction.deferReply({ flags: 64 });

    const channel = interaction.channel as any;
    let messages = await channel.messages.fetch({ limit: user ? 100 : count });

    if (user) {
        messages = messages.filter((m: any) => m.author.id === user.id);
        messages = messages.first(count);
    }

    const deleted = await channel.bulkDelete(messages, true);

    await interaction.editReply(`🗑️ Deleted **${deleted.size}** message(s).`);
}
