import {
  SlashCommandBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { db, getConfig } from "../../modules/db";

db.run(`CREATE TABLE IF NOT EXISTS giveaways (
  message_id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  prize TEXT NOT NULL,
  description TEXT,
  host TEXT NOT NULL,
  winners_count INTEGER NOT NULL DEFAULT 1,
  ends_at INTEGER NOT NULL,
  ended INTEGER NOT NULL DEFAULT 0
)`);

export const data = new SlashCommandBuilder()
  .setName("giveaway")
  .setDescription("Create a giveaway")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  const channelId = getConfig("giveaway_channel");
  if (!channelId) {
    await interaction.reply({ content: "Channel not set. Use `/set-giveaway-channel` first.", flags: 64 });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId("giveaway_modal")
    .setTitle("Create a Giveaway");

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("gw_prize").setLabel("Prize").setPlaceholder("PlayStation 5 Digital Edition").setStyle(TextInputStyle.Short).setRequired(true),
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("gw_description").setLabel("Description (optional)").setPlaceholder("Must be Level 5+ to enter").setStyle(TextInputStyle.Paragraph).setRequired(false),
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("gw_winners").setLabel("Number of winners").setPlaceholder("1").setStyle(TextInputStyle.Short).setRequired(true),
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("gw_duration").setLabel("Duration in hours").setPlaceholder("24").setStyle(TextInputStyle.Short).setRequired(true),
    ),
  );

  await interaction.showModal(modal);
}

export async function handleModal(interaction: ModalSubmitInteraction) {
  const prize = interaction.fields.getTextInputValue("gw_prize");
  const description = interaction.fields.getTextInputValue("gw_description");
  const winnersCount = Math.max(1, parseInt(interaction.fields.getTextInputValue("gw_winners")) || 1);
  const hours = parseFloat(interaction.fields.getTextInputValue("gw_duration"));

  if (!hours || hours <= 0) {
    await interaction.reply({ content: "Invalid duration.", flags: 64 });
    return;
  }

  const channelId = getConfig("giveaway_channel")!;
  const channel = interaction.guild!.channels.cache.get(channelId) as any;
  if (!channel?.isTextBased()) {
    await interaction.reply({ content: "Configured channel not found.", flags: 64 });
    return;
  }

  const endsAt = Date.now() + hours * 3600000;

  const embed = new EmbedBuilder()
    .setTitle("🎁  GIVEAWAY")
    .setDescription(
      `**${prize}**\n\n` +
      (description ? `${description}\n\n` : "") +
      `React with 🎉 to enter!`
    )
    .setColor(0xf47fff)
    .addFields(
      { name: "Hosted by", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Winners", value: `${winnersCount}`, inline: true },
      { name: "Ends", value: `<t:${Math.floor(endsAt / 1000)}:R>`, inline: true },
    )
    .setFooter({ text: "Shadow Seneschal • React 🎉 to enter" })
    .setTimestamp(endsAt);

  const msg = await channel.send({ embeds: [embed] });
  await msg.react("🎉");

  db.run(
    "INSERT INTO giveaways (message_id, channel_id, prize, description, host, winners_count, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [msg.id, channelId, prize, description || null, interaction.user.id, winnersCount, endsAt]
  );

  // Auto-end timer
  setTimeout(() => endGiveaway(msg.id, interaction.client), hours * 3600000);

  await interaction.reply({ content: `✅ Giveaway posted in <#${channelId}>`, flags: 64 });
}

export async function endGiveaway(messageId: string, client: any) {
  const gw = db.query("SELECT * FROM giveaways WHERE message_id = ? AND ended = 0").get(messageId) as any;
  if (!gw) return;

  const channel = await client.channels.fetch(gw.channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;

  const msg = await (channel as any).messages.fetch(messageId).catch(() => null);
  if (!msg) return;

  const reaction = msg.reactions.cache.get("🎉");
  const users = reaction ? await reaction.users.fetch() : new Map();
  const entries = users.filter((u: any) => !u.bot);
  const entryCount = entries.size;

  let winners: any[] = [];
  const entryArray = [...entries.values()];

  for (let i = 0; i < Math.min(gw.winners_count, entryArray.length); i++) {
    const idx = Math.floor(Math.random() * entryArray.length);
    winners.push(entryArray.splice(idx, 1)[0]);
  }

  const winnerMentions = winners.length ? winners.map((w: any) => `<@${w.id}>`).join(", ") : "No valid entries";

  const embed = new EmbedBuilder()
    .setTitle("🎁  GIVEAWAY ENDED")
    .setDescription(
      `**${gw.prize}**\n\n` +
      (gw.description ? `${gw.description}\n\n` : "")
    )
    .setColor(0x2c2f33)
    .addFields(
      { name: "Winner(s)", value: winnerMentions },
      { name: "Entries", value: `${entryCount}`, inline: true },
      { name: "Hosted by", value: `<@${gw.host}>`, inline: true },
    )
    .setFooter({ text: "Shadow Seneschal • Giveaway ended" })
    .setTimestamp();

  await msg.edit({ embeds: [embed] });

  if (winners.length) {
    await (channel as any).send(`🎉 Congratulations ${winnerMentions}! You won **${gw.prize}**!`);
    for (const winner of winners) {
      await winner.send({
        embeds: [new EmbedBuilder()
          .setTitle("🎉 You won a giveaway!")
          .setDescription(`You won **${gw.prize}** in **${msg.guild.name}**!`)
          .setColor(0xf47fff)
          .setTimestamp()],
      }).catch(() => {});
    }
  }

  db.run("UPDATE giveaways SET ended = 1 WHERE message_id = ?", [messageId]);
}

export async function rerollGiveaway(messageId: string, client: any) {
  const gw = db.query("SELECT * FROM giveaways WHERE message_id = ? AND ended = 1").get(messageId) as any;
  if (!gw) return null;

  const channel = await client.channels.fetch(gw.channel_id).catch(() => null);
  if (!channel?.isTextBased()) return null;

  const msg = await (channel as any).messages.fetch(messageId).catch(() => null);
  if (!msg) return null;

  const reaction = msg.reactions.cache.get("🎉");
  const users = reaction ? await reaction.users.fetch() : new Map();
  const entries = [...users.filter((u: any) => !u.bot).values()];

  if (!entries.length) return null;

  const winner = entries[Math.floor(Math.random() * entries.length)];
  await (channel as any).send(`🎉 Rerolled! New winner: <@${winner.id}> — **${gw.prize}**!`);
  await winner.send({
    embeds: [new EmbedBuilder().setTitle("🎉 You won a giveaway (reroll)!").setDescription(`You won **${gw.prize}** in **${msg.guild.name}**!`).setColor(0xf47fff).setTimestamp()],
  }).catch(() => {});

  return winner;
}
