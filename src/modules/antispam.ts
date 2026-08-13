import { Events, EmbedBuilder, type Client, type Message } from "discord.js";
import { addWarn, getWarns } from "./warns";

const SPAM_THRESHOLD = 3; // same message sent this many times = spam
const SPAM_WINDOW = 10_000; // within 10 seconds
const BAN_THRESHOLD = 15; // softban after this many spam warns

// Track recent messages per user: userId -> [{ content, timestamp }]
const recentMessages = new Map<string, { content: string; timestamp: number }[]>();

function getSpamWarnCount(userId: string): number {
  return getWarns(userId).filter((w) => w.reason.startsWith("Spamming (auto-detected")).length;
}

function cleanOldMessages(userId: string) {
  const messages = recentMessages.get(userId);
  if (!messages) return;
  const now = Date.now();
  const filtered = messages.filter((m) => now - m.timestamp < SPAM_WINDOW);
  if (filtered.length === 0) {
    recentMessages.delete(userId);
  } else {
    recentMessages.set(userId, filtered);
  }
}

function isSpam(userId: string, content: string): boolean {
  cleanOldMessages(userId);

  const messages = recentMessages.get(userId) ?? [];
  messages.push({ content, timestamp: Date.now() });
  recentMessages.set(userId, messages);

  // Count how many times the same message appears in the window
  const duplicates = messages.filter((m) => m.content === content).length;
  return duplicates >= SPAM_THRESHOLD;
}

export function setupAntispam(client: Client) {
  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.trim()) return;

    const userId = message.author.id;
    const content = message.content.trim().toLowerCase();

    if (!isSpam(userId, content)) return;

    // It's spam — delete the message
    await message.delete().catch(() => {});

    // Clear their message history so it doesn't keep re-triggering instantly
    recentMessages.delete(userId);

    // Issue a warn
    const currentWarns = getSpamWarnCount(userId);
    addWarn(userId, client.user!.id, `Spamming (auto-detected, warning ${currentWarns + 1})`);

    if (currentWarns + 1 >= BAN_THRESHOLD) {
      // Softban: DM → ban (with message deletion) → unban
      await message.author.send({
        embeds: [new EmbedBuilder()
          .setTitle(`🔨 You have been banned from ${message.guild.name}`)
          .setColor(0xed4245)
          .setDescription("You were banned for repeated spamming after 15 warnings.")
          .addFields(
            { name: "Reason", value: "Spamming (exceeded 15 warnings)" },
            { name: "Want to appeal?", value: "Contact the owner: [`first_knight780` on Discord](https://discord.com/users/780093677308182530)" },
          )
          .setTimestamp()],
      }).catch(() => {});

      const member = await message.guild.members.fetch(userId).catch(() => null);
      if (member) {
        await member.ban({ deleteMessageSeconds: 600, reason: "Anti-spam: exceeded 15 spam warnings" }).catch(() => {});
        await message.guild.members.unban(userId, "Softban complete — user can rejoin via invite").catch(() => {});
      }

      console.log(`[ANTISPAM] Softbanned ${message.author.tag} for repeated spamming (${currentWarns + 1} warns)`);
      return;
    }

    await message.author.send({
      embeds: [new EmbedBuilder()
        .setTitle(`⚠️ Spam Warning in ${message.guild.name}`)
        .setColor(0xfee75c)
        .setDescription(`You are sending the same message too quickly. This is spam warning **#${currentWarns + 1}**.`)
        .addFields(
          { name: "Action taken", value: "Your message was deleted and a warn was issued." },
        )
        .setTimestamp()],
    }).catch(() => {});

    console.log(`[ANTISPAM] Warned ${message.author.tag} | Spam warning #${currentWarns + 1}`);
  });
}
