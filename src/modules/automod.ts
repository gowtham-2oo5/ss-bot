import { Events, type Client, type Message } from "discord.js";

const BANNED_WORDS = (process.env.BANNED_WORDS ?? "")
  .split(",")
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean);

// Track strikes per user (resets on restart — swap with DB later if needed)
const strikes = new Map<string, number>();
const MAX_STRIKES = 3;

function containsBannedWord(content: string): boolean {
  const text = content.toLowerCase();
  // Check whole words
  if (BANNED_WORDS.some((word) => new RegExp(`\\b${word}\\b`).test(text))) return true;
  // Check spaced-out bypass (e.g. "f u c k" or "f.u.c.k")
  const collapsed = text.replace(/[^a-z]/g, "");
  if (collapsed.length <= 6) {
    return BANNED_WORDS.some((word) => collapsed === word);
  }
  return false;
}

export function setupAutomod(client: Client) {
  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot || !message.guild) return;

    if (!containsBannedWord(message.content)) return;

    // Delete the message
    await message.delete().catch(() => {});

    // Track strikes
    const userId = message.author.id;
    const current = (strikes.get(userId) ?? 0) + 1;
    strikes.set(userId, current);

    // DM the user
    const warning =
      current >= MAX_STRIKES
        ? `⚠️ You've used a blacklisted word **${current} times** in **${message.guild.name}**. Further violations will result in jailing.`
        : `🚫 Your message in **${message.guild.name}** was removed for containing a blacklisted word. (Strike ${current}/${MAX_STRIKES})`;

    await message.author.send(warning).catch(() => {});

    console.log(`[AUTOMOD] Deleted message from ${message.author.tag} | Strike ${current}`);
  });
}
