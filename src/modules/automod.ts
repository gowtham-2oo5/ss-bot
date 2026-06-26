import { Events, type Client, type Message } from "discord.js";

const BANNED_WORDS = (process.env.BANNED_WORDS ?? "")
  .split(",")
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean);

// Track strikes per user (resets on restart — swap with DB later if needed)
const strikes = new Map<string, number>();
const MAX_STRIKES = 3;

// Strip non-alpha and decode leet speak to catch bypasses
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/\$/g, "s")
    .replace(/@/g, "a")
    .replace(/!/g, "i")
    .replace(/\+/g, "t")
    .replace(/ph/g, "f")
    .replace(/[^a-z]/g, "");
}

function containsBannedWord(content: string): boolean {
  const cleaned = normalize(content);
  return BANNED_WORDS.some((word) => cleaned.includes(word));
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
