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

const pendingSetup = new Map<string, { roles: string[] }>();

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
  await interaction.reply({ content: "**Step 1:** Select roles.\n*Need a new role? Run `/create-role` first.*", components: [roleRow], flags: 64 });

  const reply = await interaction.fetchReply();
  const roleCollector = reply.createMessageComponentCollector({ componentType: ComponentType.RoleSelect, time: 60_000 });

  roleCollector.on("collect", async (ri) => {
    pendingSetup.set(interaction.user.id, { roles: ri.values });
    roleCollector.stop();

    // Step 2: Modal for title, description, and emoji mapping
    const modal = new ModalBuilder()
      .setCustomId("rr_modal")
      .setTitle("Reaction Roles Panel");

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("rr_title")
          .setLabel("Panel Title")
          .setPlaceholder("Pick Your Roles")
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("rr_description")
          .setLabel("Description (optional)")
          .setPlaceholder("React to get your roles!")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("rr_emojis")
          .setLabel("Emojis (one per line, same order as roles)")
          .setPlaceholder("🎮\n🎵\n🎨")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true),
      ),
    );

    await ri.showModal(modal);
  });

  roleCollector.on("end", (_, reason) => {
    if (reason === "time") interaction.editReply({ content: "Timed out.", components: [] }).catch(() => {});
  });
}

export async function handleModal(interaction: ModalSubmitInteraction) {
  const setup = pendingSetup.get(interaction.user.id);
  if (!setup) { await interaction.reply({ content: "Session expired. Run `/reaction-roles` again.", flags: 64 }); return; }
  pendingSetup.delete(interaction.user.id);

  const title = interaction.fields.getTextInputValue("rr_title");
  const description = interaction.fields.getTextInputValue("rr_description") || "React to get your roles!";
  const emojis = interaction.fields.getTextInputValue("rr_emojis").split("\n").map((s) => s.trim()).filter(Boolean);

  if (emojis.length !== setup.roles.length) {
    await interaction.reply({ content: `Mismatch: ${setup.roles.length} roles but ${emojis.length} emojis. Try again.`, flags: 64 });
    return;
  }

  const channelId = getConfig("reaction_roles_channel")!;
  const channel = interaction.guild!.channels.cache.get(channelId) as any;
  if (!channel?.isTextBased()) {
    await interaction.reply({ content: "Configured channel not found.", flags: 64 });
    return;
  }

  const roleList = setup.roles.map((id, i) => `${emojis[i]}  —  <@&${id}>`).join("\n");

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description + "\n\n" + roleList)
    .setColor(0x5865f2)
    .setFooter({ text: "React to toggle roles • Shadow Seneschal" })
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed] });

  for (let i = 0; i < emojis.length; i++) {
    await msg.react(emojis[i]).catch(() => {});
    db.run("INSERT OR REPLACE INTO reaction_roles (message_id, emoji, role_id) VALUES (?, ?, ?)", [msg.id, emojis[i], setup.roles[i]]);
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
