import { EmbedBuilder, Events, type Client, type GuildMember } from "discord.js";
import { getConfig } from "./db";

const WELCOME_IMAGE = "https://cdn.discordapp.com/icons/1439675181260869705/1b529b7edf2446df0bab165d4bd8d204.png";
const WEBSITE = "https://ssanctuary.vercel.app";
const INVITE_LINK = "https://discord.gg/sanctuary"; // update in .env

const BANNED_WORDS = (process.env.BANNED_WORDS ?? "").split(",").map((w) => w.trim()).filter(Boolean);

export function setupWelcome(client: Client) {
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    const channelId = getConfig("welcome_channel");
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId);
    if (!channel?.isTextBased()) return;

    // Channel welcome message
    const welcomeEmbed = new EmbedBuilder()
      .setTitle("A New Soul Arrives")
      .setDescription(
        `Welcome <@${member.id}> to the Sanctuary!\n\n` +
        `Here, every new member brings a spark that helps ignite the heart of our community. ` +
        `As you step into this realm, know that your presence strengthens the bonds we share ` +
        `and lights the way for future wanderers.\n\n` +
        `Whether you're here to connect, create, or simply explore, the Sanctuary opens its doors ` +
        `to you with warmth and purpose. Feel free to introduce yourself, join the conversations, ` +
        `and make this place your own.\n\n` +
        `Together, we rise, inspire, and keep the fire of the Sanctuary burning brighter with every new soul who arrives. **Welcome aboard!**`
      )
      .setThumbnail(member.displayAvatarURL({ size: 256 }))
      .setImage(WELCOME_IMAGE)
      .setColor(0x5865f2)
      .setFooter({ text: `Member #${member.guild.memberCount}` })
      .setTimestamp();

    await (channel as any).send({ embeds: [welcomeEmbed] });

    // DM the user
    const rulesSnippet = BANNED_WORDS.slice(0, 20).join(", ") + (BANNED_WORDS.length > 20 ? "..." : "");
    const invite = process.env.INVITE_LINK || INVITE_LINK;

    const dmEmbed = new EmbedBuilder()
      .setTitle("Welcome to the Sanctuary")
      .setDescription(
        `Greetings, **${member.user.username}**.\n\n` +
        `You've just entered a realm built on respect, creativity, and community. ` +
        `We're glad you're here — take your time exploring, and don't hesitate to jump into any conversation.\n\n` +
        `Here are a few things to get you started:`
      )
      .setColor(0x5865f2)
      .addFields(
        { name: "🌐 Our Website", value: `[ssanctuary.vercel.app](${WEBSITE})` },
        { name: "🎮 Roblox Group", value: "[Shadow Sanctuary](https://www.roblox.com/communities/840771870/Shadow-Sanctuary)" },
        { name: "🔗 Invite Friends", value: `[Share this link](${invite})` },
        { name: "📜 Rules at a Glance", value: "Be respectful. No hate speech, harassment, or NSFW content. Keep conversations family-friendly." },
        { name: "🚫 Blacklisted Words", value: `\`\`\`${rulesSnippet}\`\`\`` },
      )
      .setThumbnail(WELCOME_IMAGE)
      .setFooter({ text: "The Sanctuary • Shadow Seneschal" })
      .setTimestamp();

    await member.send({ embeds: [dmEmbed] }).catch(() => {});
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    const channelId = getConfig("farewell_channel");
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId);
    if (!channel?.isTextBased()) return;

    const leaveEmbed = new EmbedBuilder()
      .setTitle("A Soul Departs")
      .setDescription(
        `**${member.user.username}** has left the Sanctuary.\n\n` +
        `The fire dims slightly, but never fades. We wish them well on whatever path lies ahead.`
      )
      .setThumbnail(member.displayAvatarURL({ size: 256 }))
      .setColor(0x2c2f33)
      .setFooter({ text: `${member.guild.memberCount} flames remain` })
      .setTimestamp();

    await (channel as any).send({ embeds: [leaveEmbed] });

    // Attempt to DM the user (works only if they share another server with the bot or have DMs open)
    const dmEmbed = new EmbedBuilder()
      .setTitle("You left the Sanctuary")
      .setDescription(
        `Hey **${member.user.username}**, we noticed you left.\n\n` +
        `Whatever your reason, the door is always open. If something went wrong or you'd like to talk about it, ` +
        `feel free to reach out to the owner directly.`
      )
      .setColor(0x2c2f33)
      .addFields(
        { name: "Owner", value: "`first_knight780` on Discord" },
        { name: "Website", value: `[ssanctuary.vercel.app](${WEBSITE})` },
      )
      .setFooter({ text: "The Sanctuary • Shadow Seneschal" })
      .setTimestamp();

    await member.user.send({ embeds: [dmEmbed] }).catch(() => {});
  });
}
