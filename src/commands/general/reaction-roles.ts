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
  Events,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
  type Client,
} from "discord.js";
import { db, getConfig } from "../../modules/db";

db.run(`DROP TABLE IF EXISTS reaction_roles`);
db.run(`CREATE TABLE IF NOT EXISTS reaction_roles (
  message_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  role_id TEXT NOT NULL,
  PRIMARY KEY (message_id, emoji)
)`);

const pendingSetup = new Map<string, { roles: string[]; emojis: string[] }>();

export const data = new SlashCommandBuilder()
  .setName("reaction-roles")
  .setDescription("Create a self-assign role panel with reactions")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  const channelId = getConfig("reaction_roles_channel");
  if (!channelId) {
    await interaction.reply({ content: "Channel not set. Use `/set-reaction-roles-channel` first.", flags: 64 });
    return;
  }

  // Step 1: Select roles
  const roleMenu = new RoleSelectMenuBuilder()
    .setCustomId("rr_role_select")
    .setPlaceholder("Select roles for the panel")
    .setMinValues(1)
    .setMaxValues(10);

  const roleRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleMenu);
  await interaction.reply({ content: "**Step 1/3 — Select Roles**\nPick the roles you want on the panel. You can select up to 10.\n\n> 💡 *Need to create a role first? Run `/create-role` in another channel, then come back.*", components: [roleRow], flags: 64 });

  const reply = await interaction.fetchReply();
  const roleCollector = reply.createMessageComponentCollector({ componentType: ComponentType.RoleSelect, time: 60_000 });

  roleCollector.on("collect", async (ri) => {
    const roles = ri.values;
    roleCollector.stop();

    // Step 2: React with emojis
    const guild = interaction.guild!;
    const roleNames = roles.map((id) => guild.roles.cache.get(id)?.name ?? id);
    const instructions = roles.map((id, i) => `${i + 1}. <@&${id}>`).join("\n");

    await ri.update({
      content: `**Step 2/3 — Assign Emojis**\nReact to **this message** with one emoji per role, in the order listed below.\n\n${instructions}\n\n> 💡 *Use any emoji — default or server custom. Just click them from the emoji picker in order.*\n\n⏳ Waiting for ${roles.length} reaction(s)...`,
      components: [],
    });

    const updatedReply = await interaction.fetchReply();
    const collected: string[] = [];

    const reactionCollector = updatedReply.createReactionCollector({
      filter: (_, user) => user.id === interaction.user.id,
      max: roles.length,
      time: 60_000,
    });

    reactionCollector.on("collect", (reaction) => {
      const emoji = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name!;
      collected.push(emoji);
    });

    reactionCollector.on("end", async () => {
      if (collected.length !== roles.length) {
        await interaction.editReply({ content: `❌ Expected ${roles.length} emoji(s) but got ${collected.length}. Please run \`/reaction-roles\` again to restart.` });
        return;
      }

      pendingSetup.set(interaction.user.id, { roles, emojis: collected });

      // Step 3: Modal for title/description
      // Can't show modal from here (no interaction context), so prompt to run a follow-up
      // Instead, we'll use a button to trigger the modal
      await interaction.editReply({
        content: `✅ **Emojis captured:** ${collected.join(" ")}\n\n**Step 3/3 — Finalize**\nRun \`/reaction-roles-confirm\` now to set the panel title and post it.`,
      });
    });
  });

  roleCollector.on("end", (_, reason) => {
    if (reason === "time") interaction.editReply({ content: "Timed out.", components: [] }).catch(() => {});
  });
}

// Separate confirm command since we can't show a modal from a reaction collector
export const confirmData = new SlashCommandBuilder()
  .setName("reaction-roles-confirm")
  .setDescription("Confirm and post the reaction roles panel")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function confirmExecute(interaction: ChatInputCommandInteraction) {
  const setup = pendingSetup.get(interaction.user.id);
  if (!setup) {
    await interaction.reply({ content: "No pending setup. Run `/reaction-roles` first.", flags: 64 });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId("rr_modal")
    .setTitle("Reaction Roles Panel");

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("rr_title").setLabel("Panel Title").setPlaceholder("Pick Your Roles").setStyle(TextInputStyle.Short).setRequired(true),
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("rr_description").setLabel("Description (optional)").setPlaceholder("React to get your roles!").setStyle(TextInputStyle.Paragraph).setRequired(false),
    ),
  );

  await interaction.showModal(modal);
}

export async function handleModal(interaction: ModalSubmitInteraction) {
  const setup = pendingSetup.get(interaction.user.id);
  if (!setup) { await interaction.reply({ content: "Session expired. Run `/reaction-roles` again.", flags: 64 }); return; }
  pendingSetup.delete(interaction.user.id);

  const title = interaction.fields.getTextInputValue("rr_title");
  const description = interaction.fields.getTextInputValue("rr_description") || "React to toggle your roles.";

  const channelId = getConfig("reaction_roles_channel")!;
  const channel = interaction.guild!.channels.cache.get(channelId) as any;
  if (!channel?.isTextBased()) {
    await interaction.reply({ content: "Configured channel not found.", flags: 64 });
    return;
  }

  const roleList = setup.roles.map((id, i) => `${setup.emojis[i]}  —  <@&${id}>`).join("\n");

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description + "\n\n" + roleList)
    .setColor(0x5865f2)
    .setFooter({ text: "React to toggle roles • Shadow Seneschal" })
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed] });

  for (let i = 0; i < setup.emojis.length; i++) {
    const emoji = setup.emojis[i];
    // For custom emojis, extract the ID for reacting
    const customMatch = emoji.match(/<:.+:(\d+)>/);
    await msg.react(customMatch ? customMatch[1] : emoji).catch(() => {});
    db.run("INSERT OR REPLACE INTO reaction_roles (message_id, emoji, role_id) VALUES (?, ?, ?)", [msg.id, emoji, setup.roles[i]]);
  }

  await interaction.reply({ content: `✅ Panel posted in <#${channelId}>`, flags: 64 });
}

// Reaction event handlers
export function setupReactionRoles(client: Client) {
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch().catch(() => {});

    const emoji = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name!;
    const row = db.query("SELECT role_id FROM reaction_roles WHERE message_id = ? AND emoji = ?").get(reaction.message.id, emoji) as any;
    if (!row) return;

    const guild = reaction.message.guild!;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (member) await member.roles.add(row.role_id).catch(() => {});
  });

  client.on(Events.MessageReactionRemove, async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch().catch(() => {});

    const emoji = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name!;
    const row = db.query("SELECT role_id FROM reaction_roles WHERE message_id = ? AND emoji = ?").get(reaction.message.id, emoji) as any;
    if (!row) return;

    const guild = reaction.message.guild!;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (member) await member.roles.remove(row.role_id).catch(() => {});
  });
}
