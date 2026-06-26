import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from "discord.js";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { startServer } from "./server";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

// Load commands
const commands = new Collection<string, any>();
const commandsPath = join(import.meta.dir, "commands");
const commandFiles = readdirSync(commandsPath).filter((f) => f.endsWith(".ts"));

for (const file of commandFiles) {
  const command = await import(join(commandsPath, file));
  if ("data" in command && "execute" in command) {
    commands.set(command.data.name, command);
  }
}

client.once("clientReady", (readyClient) => {
  console.log(`⚔️  Shadow Seneschal online — logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
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

startServer(client);
client.login(process.env.DISCORD_TOKEN);
