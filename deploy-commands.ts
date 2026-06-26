import { REST, Routes } from "discord.js";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.CLIENT_ID!;
const guildId = process.env.GUILD_ID!;

const commands: any[] = [];
const commandsPath = join(import.meta.dir, "commands");
const commandFiles = readdirSync(commandsPath).filter((f) => f.endsWith(".ts"));

for (const file of commandFiles) {
  const command = await import(join(commandsPath, file));
  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST().setToken(token);

try {
  console.log(`Deploying ${commands.length} command(s)...`);
  const data: any = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
  console.log(`✓ Deployed ${data.length} command(s).`);
} catch (error) {
  console.error(error);
}
