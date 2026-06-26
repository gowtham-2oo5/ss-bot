import { REST, Routes } from "discord.js";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.CLIENT_ID!;
const guildId = process.env.GUILD_ID!;

const commands: any[] = [];
const commandsPath = join(import.meta.dir, "src", "commands");

async function loadCommands(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      await loadCommands(full);
    } else if (entry.endsWith(".ts")) {
      const command = await import(full);
      if ("data" in command && "execute" in command) {
        commands.push(command.data.toJSON());
      }
    }
  }
}
await loadCommands(commandsPath);

const rest = new REST().setToken(token);

try {
  console.log(`Deploying ${commands.length} command(s)...`);
  const data: any = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
  console.log(`✓ Deployed ${data.length} command(s).`);
} catch (error) {
  console.error(error);
}
