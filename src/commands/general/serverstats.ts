import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("serverstats")
  .setDescription("Display stats about this server")
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  const guild = interaction.client.guilds.cache.get(interaction.guildId!);
  if (!guild) {
    await interaction.reply({ content: "Could not resolve this server.", flags: 64 });
    return;
  }

  const total = guild.memberCount;
  const online = guild.members.cache.filter((m) => m.presence?.status === "online").size;
  const idle = guild.members.cache.filter((m) => m.presence?.status === "idle").size;
  const dnd = guild.members.cache.filter((m) => m.presence?.status === "dnd").size;
  const offline = total - online - idle - dnd;
  const bots = guild.members.cache.filter((m) => m.user.bot).size;
  const humans = total - bots;
  const textChannels = guild.channels.cache.filter((c) => c.isTextBased() && !c.isVoiceBased()).size;
  const voiceChannels = guild.channels.cache.filter((c) => c.isVoiceBased()).size;
  const roles = guild.roles.cache.size - 1;
  const boosts = guild.premiumSubscriptionCount ?? 0;

  const embed = new EmbedBuilder()
    .setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })
    .setTitle("Server Statistics")
    .setColor(0x5865f2)
    .setThumbnail(guild.iconURL({ size: 256 }))
    .setDescription(`> *Created <t:${Math.floor(guild.createdTimestamp / 1000)}:R>*`)
    .addFields(
      {
        name: "👥 Members",
        value: [
          `\`\`\``,
          `Total    : ${total}`,
          `Humans   : ${humans}`,
          `Bots     : ${bots}`,
          `\`\`\``,
        ].join("\n"),
        inline: true,
      },
      {
        name: "🟢 Presence",
        value: [
          `\`\`\``,
          `Online   : ${online}`,
          `Idle     : ${idle}`,
          `DND      : ${dnd}`,
          `Offline  : ${offline}`,
          `\`\`\``,
        ].join("\n"),
        inline: true,
      },
      { name: "\u200b", value: "\u200b", inline: false },
      {
        name: "💬 Channels",
        value: [
          `\`\`\``,
          `Text     : ${textChannels}`,
          `Voice    : ${voiceChannels}`,
          `\`\`\``,
        ].join("\n"),
        inline: true,
      },
      {
        name: "✨ Extras",
        value: [
          `\`\`\``,
          `Roles    : ${roles}`,
          `Boosts   : ${boosts}`,
          `Level    : ${guild.premiumTier}`,
          `\`\`\``,
        ].join("\n"),
        inline: true,
      },
    )
    .setFooter({ text: `ID: ${guild.id} • Shadow Seneschal` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
