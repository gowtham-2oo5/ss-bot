import {
  SlashCommandBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  RoleSelectMenuBuilder,
  PermissionFlagsBits,
  ComponentType,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { db, getConfig } from "../../modules/db";

db.run(`CREATE TABLE IF NOT EXISTS polls (
  message_id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  ends_at INTEGER
)`);

const EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

const pendingRoles = new Map<string, string[]>();

export const data = new SlashCommandBuilder()
  .setName("poll")
  .setDescription("Create a reaction poll")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  const menu = new RoleSelectMenuBuilder()
    .setCustomId("poll_role_select")
    .setPlaceholder("Select roles to ping")
    .setMinValues(0)
    .setMaxValues(10);

  const row = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(menu);
  await interaction.reply({ content: "Select roles to ping, then the form will open.", components: [row], flags: 64 });

  const collector = (await interaction.fetchReply()).createMessageComponentCollector({
    componentType: ComponentType.RoleSelect,
    time: 60_000,
  });

  collector.on("collect", async (i) => {
    pendingRoles.set(interaction.user.id, i.values);
    collector.stop();
    await showModal(i);
  });

  collector.on("end", (_, reason) => {
    if (reason === "time") {
      interaction.editReply({ content: "Timed out. Run `/poll` again.", components: [] }).catch(() => {});
    }
  });
}

async function showModal(i: any) {
  const modal = new ModalBuilder()
    .setCustomId("poll_modal")
    .setTitle("Create a Poll");

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("poll_question")
        .setLabel("Question")
        .setPlaceholder("What should we play on Friday?")
        .setStyle(TextInputStyle.Short)
        .setRequired(true),
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("poll_options")
        .setLabel("Options (one per line, 2-10)")
        .setPlaceholder("Valorant\nMinecraft\nGTA V")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true),
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("poll_duration")
        .setLabel("Duration in hours (optional)")
        .setPlaceholder("24")
        .setStyle(TextInputStyle.Short)
        .setRequired(false),
    ),
  );

  await i.showModal(modal);
}

export async function handleModal(interaction: ModalSubmitInteraction) {
  const question = interaction.fields.getTextInputValue("poll_question");
  const rawOptions = interaction.fields.getTextInputValue("poll_options").split("\n").map((s) => s.trim()).filter(Boolean);
  const durationStr = interaction.fields.getTextInputValue("poll_duration");

  if (rawOptions.length < 2 || rawOptions.length > 10) {
    await interaction.reply({ content: "Provide 2-10 options (one per line).", flags: 64 });
    return;
  }

  const pollChannelId = getConfig("poll_channel");
  if (!pollChannelId) {
    await interaction.reply({ content: "Poll channel not set. Use `/set-poll-channel` first.", flags: 64 });
    return;
  }

  const pollChannel = await interaction.client.channels.fetch(pollChannelId).catch(() => null) as any;
  if (!pollChannel?.isTextBased()) {
    await interaction.reply({ content: "Configured poll channel not found.", flags: 64 });
    return;
  }

  const roleIds = pendingRoles.get(interaction.user.id) ?? [];
  pendingRoles.delete(interaction.user.id);
  const pings = roleIds.map((id) => `<@&${id}>`).join(" ");

  const endsAt = durationStr ? Date.now() + Number(durationStr) * 3600000 : null;
  const description = rawOptions.map((opt, i) => `**${i + 1}.** ${opt}`).join("\n\n");

  const embed = new EmbedBuilder()
    .setTitle(question)
    .setDescription(description)
    .setColor(0x5865f2)
    .setFooter({ text: endsAt ? `Ends <t:${Math.floor(endsAt / 1000)}:R> • React to vote` : "No time limit • React to vote" })
    .setTimestamp();

  await interaction.reply({ content: "✅ Poll created!", flags: 64 });
  const msg = await pollChannel.send({ content: pings || undefined, embeds: [embed] });

  for (let i = 0; i < rawOptions.length; i++) {
    await msg.react(EMOJIS[i]);
  }

  db.run("INSERT INTO polls (message_id, channel_id, question, options, ends_at) VALUES (?, ?, ?, ?, ?)", [
    msg.id, msg.channelId, question, JSON.stringify(rawOptions), endsAt,
  ]);

  if (endsAt && durationStr) {
    setTimeout(() => closePoll(msg.id, interaction.client), Number(durationStr) * 3600000);
  }
}

export async function closePoll(messageId: string, client: any) {
  const poll = db.query("SELECT * FROM polls WHERE message_id = ?").get(messageId) as any;
  if (!poll) return;

  const channel = await client.channels.fetch(poll.channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;

  const msg = await (channel as any).messages.fetch(messageId).catch(() => null);
  if (!msg) return;

  const options: string[] = JSON.parse(poll.options);
  const results: { name: string; votes: number }[] = [];

  for (let i = 0; i < options.length; i++) {
    const reaction = msg.reactions.cache.get(EMOJIS[i]);
    const votes = reaction ? reaction.count - 1 : 0;
    results.push({ name: options[i], votes });
  }

  const totalVotes = results.reduce((sum, r) => sum + r.votes, 0);
  const maxVotes = Math.max(...results.map((r) => r.votes));

  const description = results.map((r, i) => {
    const pct = totalVotes > 0 ? Math.round((r.votes / totalVotes) * 100) : 0;
    const filled = Math.round(pct / 10);
    const bar = "▓".repeat(filled) + "░".repeat(10 - filled);
    const winner = r.votes === maxVotes && maxVotes > 0 ? "  ←" : "";
    return `**${i + 1}.** ${r.name}${winner}\n\`${bar}\` **${pct}%** (${r.votes})`;
  }).join("\n\n");

  const embed = new EmbedBuilder()
    .setTitle(`Poll Ended — ${poll.question}`)
    .setDescription(description)
    .setColor(0x57f287)
    .setFooter({ text: `${totalVotes} total votes` })
    .setTimestamp();

  await msg.edit({ embeds: [embed] });
  await msg.reactions.removeAll().catch(() => {});
  db.run("DELETE FROM polls WHERE message_id = ?", [messageId]);
}
