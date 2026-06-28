import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getConfig } from "../../modules/db";

interface CmdInfo {
  name: string;
  description: string;
  usage: string;
  example: string;
}

const categories: Record<string, { emoji: string; commands: CmdInfo[] }> = {
  Moderation: {
    emoji: "🛡️",
    commands: [
      { name: "warn", description: "Warn a user", usage: "/warn @user reason", example: "/warn @toxic Spamming" },
      { name: "warns", description: "View warns for a user", usage: "/warns @user", example: "/warns @toxic" },
      { name: "delwarn", description: "Delete warns for a user", usage: "/delwarn @user [all:true]", example: "/delwarn @toxic all:True" },
      { name: "kick", description: "Kick a user", usage: "/kick @user [reason]", example: "/kick @toxic Bye" },
      { name: "ban", description: "Ban a user", usage: "/ban @user [reason]", example: "/ban @toxic Permanent" },
      { name: "timeout", description: "Timeout a user", usage: "/timeout @user duration [reason]", example: "/timeout @toxic 1h Chill" },
      { name: "jail", description: "Jail a user — strips roles, confines to one channel", usage: "/jail @user [reason]", example: "/jail @toxic Spamming" },
      { name: "unjail", description: "Release a user from jail and restore roles", usage: "/unjail @user", example: "/unjail @toxic" },
      { name: "create-role", description: "Create a new role", usage: "/create-role name [color] [clone-from] [below]", example: "/create-role Gamer #ff5733" },
      { name: "purge", description: "Delete multiple messages", usage: "/purge count [user]", example: "/purge 50" },
    ],
  },
  General: {
    emoji: "📊",
    commands: [
      { name: "serverstats", description: "Display server statistics", usage: "/serverstats", example: "/serverstats" },
      { name: "roles", description: "Browse members by role", usage: "/roles", example: "/roles" },
      { name: "poll", description: "Create a reaction poll", usage: "/poll", example: "/poll" },
      { name: "poll-end", description: "End an active poll", usage: "/poll-end", example: "/poll-end" },
      { name: "reaction-roles", description: "Create a self-assign role panel", usage: "/reaction-roles", example: "/reaction-roles" },
      { name: "giveaway", description: "Create a giveaway", usage: "/giveaway", example: "/giveaway" },
      { name: "giveaway-end", description: "End an active giveaway", usage: "/giveaway-end", example: "/giveaway-end" },
      { name: "giveaway-reroll", description: "Reroll a giveaway winner", usage: "/giveaway-reroll", example: "/giveaway-reroll" },
      { name: "help", description: "Show this help menu", usage: "/help", example: "/help" },
    ],
  },
  Configuration: {
    emoji: "⚙️",
    commands: [
      { name: "set-prefix", description: "Set bot prefix for text commands", usage: "/set-prefix prefix", example: "/set-prefix !" },
      { name: "set-welcome-channel", description: "Set welcome message channel", usage: "/set-welcome-channel #channel", example: "/set-welcome-channel #welcome" },
      { name: "set-farewell-channel", description: "Set farewell message channel", usage: "/set-farewell-channel #channel", example: "/set-farewell-channel #bye" },
      { name: "set-poll-channel", description: "Set poll channel", usage: "/set-poll-channel #channel", example: "/set-poll-channel #polls" },
      { name: "set-jail-channel", description: "Set jail channel", usage: "/set-jail-channel #channel", example: "/set-jail-channel #jail" },
      { name: "set-reaction-roles-channel", description: "Set reaction roles channel", usage: "/set-reaction-roles-channel #channel", example: "/set-reaction-roles-channel #roles" },
      { name: "set-giveaway-channel", description: "Set giveaway channel", usage: "/set-giveaway-channel #channel", example: "/set-giveaway-channel #giveaways" },
    ],
  },
};

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("View all bot commands")
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  const prefix = getConfig("prefix") || "!";

  const overviewEmbed = new EmbedBuilder()
    .setTitle("Shadow Seneschal — Command Directory")
    .setDescription(`Select a category below to explore commands.\n\nPrefix: \`${prefix}\``)
    .setColor(0x5865f2)
    .addFields(
      Object.entries(categories).map(([name, cat]) => ({
        name: `${cat.emoji} ${name}`,
        value: cat.commands.map((c) => `\`${c.name}\``).join(", "),
      }))
    )
    .setFooter({ text: "Shadow Seneschal" })
    .setTimestamp();

  const catMenu = new StringSelectMenuBuilder()
    .setCustomId("help_category")
    .setPlaceholder("Select a category")
    .addOptions(Object.entries(categories).map(([name, cat]) => ({
      label: name,
      emoji: cat.emoji,
      value: name,
    })));

  const catRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(catMenu);
  const reply = await interaction.reply({ embeds: [overviewEmbed], components: [catRow], fetchReply: true });

  const collector = reply.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 120_000 });

  collector.on("collect", async (i) => {
    if (i.customId === "help_category") {
      const cat = categories[i.values[0]];
      const catEmbed = new EmbedBuilder()
        .setTitle(`${cat.emoji} ${i.values[0]} Commands`)
        .setDescription(cat.commands.map((c) => `**\`/${c.name}\`** — ${c.description}`).join("\n"))
        .setColor(0x5865f2)
        .setFooter({ text: "Select a command below for details" })
        .setTimestamp();

      const cmdMenu = new StringSelectMenuBuilder()
        .setCustomId("help_command")
        .setPlaceholder("Select a command for details")
        .addOptions(cat.commands.map((c) => ({
          label: `/${c.name}`,
          value: `${i.values[0]}:${c.name}`,
          description: c.description.slice(0, 100),
        })));

      const cmdRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(cmdMenu);
      await i.update({ embeds: [catEmbed], components: [catRow, cmdRow] });
    } else if (i.customId === "help_command") {
      const [catName, cmdName] = i.values[0].split(":");
      const cmd = categories[catName].commands.find((c) => c.name === cmdName)!;

      const cmdEmbed = new EmbedBuilder()
        .setTitle(`/${cmd.name}`)
        .setDescription(cmd.description)
        .setColor(0x5865f2)
        .addFields(
          { name: "Usage", value: `\`${cmd.usage}\`` },
          { name: "Example", value: `\`${cmd.example}\`` },
        )
        .setFooter({ text: "Requires: Manage Server (for mod/config commands)" })
        .setTimestamp();

      await i.update({ embeds: [cmdEmbed], components: [catRow] });
    }
  });

  collector.on("end", () => {
    reply.edit({ components: [] }).catch(() => {});
  });
}
