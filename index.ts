import { Client, Collection, Events, GatewayIntentBits, MessageFlags, Partials } from "discord.js";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { startServer } from "./src/modules/server";
import { setupAutomod } from "./src/modules/automod";
import { setupWelcome } from "./src/modules/welcome";
import { setupReactionRoles } from "./src/commands/general/reaction-roles";
import { setupPrefix } from "./src/modules/prefix";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User],
});

// Load commands recursively
const commands = new Collection<string, any>();
const commandsPath = join(import.meta.dir, "src", "commands");

async function loadCommands(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      await loadCommands(full);
    } else if (entry.endsWith(".ts")) {
      const command = await import(full);
      if ("data" in command && "execute" in command) {
        commands.set(command.data.name, command);
      }
    }
  }
}
await loadCommands(commandsPath);

client.once("clientReady", (readyClient) => {
  console.log(`⚔️  Shadow Seneschal online — logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "poll_modal") {
      const { handleModal } = await import("./src/commands/general/poll");
      await handleModal(interaction);
    } else if (interaction.customId === "rr_modal") {
      const { handleModal } = await import("./src/commands/general/reaction-roles");
      await handleModal(interaction);
    } else if (interaction.customId === "giveaway_modal") {
      const { handleModal } = await import("./src/commands/general/giveaway");
      await handleModal(interaction);
    }
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith("rr_btn_")) {
    return;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "rr_dropdown") {
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    const reply = { content: "An error occurred executing that command.", flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

setupAutomod(client);
setupWelcome(client);
setupReactionRoles(client);
setupPrefix(client);
startServer(client);
client.login(process.env.DISCORD_TOKEN);
