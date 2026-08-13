import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { Socket } from "net";

const ALLOWED_ROLE_ID = "1469507132453027954";
const MC_RCON_HOST = process.env.MC_RCON_HOST ?? "3.7.106.192";
const MC_RCON_PORT = parseInt(process.env.MC_RCON_PORT ?? "25575");
const MC_RCON_PASSWORD = process.env.MC_RCON_PASSWORD ?? "";

export const data = new SlashCommandBuilder()
  .setName("mc-whitelist")
  .setDescription("Whitelist yourself on the Minecraft server")
  .addStringOption((option) =>
    option
      .setName("username")
      .setDescription("Your Minecraft username (Java Edition)")
      .setRequired(true)
      .setMinLength(3)
      .setMaxLength(16)
  )
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member as any;
  
  // Check if user has the required role
  if (!member?.roles?.cache?.has(ALLOWED_ROLE_ID)) {
    const embed = new EmbedBuilder()
      .setTitle("❌ Access Denied")
      .setDescription("You need the required role to whitelist yourself on the Minecraft server.")
      .setColor(0xff4444)
      .setFooter({ text: "Shadow Seneschal • MC Whitelist" })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  const username = interaction.options.getString("username", true);
  
  // Validate Minecraft username (alphanumeric and underscores only)
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
    const embed = new EmbedBuilder()
      .setTitle("❌ Invalid Username")
      .setDescription("Minecraft usernames can only contain letters, numbers, and underscores (3-16 characters).")
      .setColor(0xff4444)
      .setFooter({ text: "Shadow Seneschal • MC Whitelist" })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const response = await sendRconCommand(`whitelist add ${username}`);
    
    const isSuccess = response.toLowerCase().includes("added") || 
                      response.toLowerCase().includes("already");
    
    const embed = new EmbedBuilder()
      .setTitle(isSuccess ? "✅ Whitelisted!" : "⚠️ Response")
      .setDescription(isSuccess 
        ? `**${username}** has been added to the whitelist!\n\n🎮 **Server:** \`ss-mc.gowth.tech\`\n📦 **Modpack:** Craft to Exile 2`
        : `Server response: ${response}`)
      .setColor(isSuccess ? 0x44ff44 : 0xffaa00)
      .setFooter({ text: "Shadow Seneschal • MC Whitelist" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    console.error("RCON Error:", error);
    
    const embed = new EmbedBuilder()
      .setTitle("❌ Connection Error")
      .setDescription("Could not connect to the Minecraft server. Please try again later or contact an admin.")
      .setColor(0xff4444)
      .setFooter({ text: "Shadow Seneschal • MC Whitelist" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}

// Simple RCON implementation
async function sendRconCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    let authenticated = false;
    let responseData = Buffer.alloc(0);
    
    socket.setTimeout(10000);
    
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Connection timeout"));
    });
    
    socket.on("error", (err) => {
      reject(err);
    });
    
    socket.on("data", (data) => {
      responseData = Buffer.concat([responseData, data]);
      
      // Check if we have a complete packet
      if (responseData.length >= 14) {
        const length = responseData.readInt32LE(0);
        const id = responseData.readInt32LE(4);
        const type = responseData.readInt32LE(8);
        
        if (responseData.length >= length + 4) {
          const body = responseData.slice(12, 12 + length - 10).toString("utf8");
          
          if (!authenticated) {
            if (id === -1) {
              socket.destroy();
              reject(new Error("Authentication failed"));
              return;
            }
            authenticated = true;
            // Send command
            sendPacket(socket, 2, command);
            responseData = Buffer.alloc(0);
          } else {
            socket.destroy();
            resolve(body);
          }
        }
      }
    });
    
    socket.connect(MC_RCON_PORT, MC_RCON_HOST, () => {
      // Send auth packet
      sendPacket(socket, 3, MC_RCON_PASSWORD);
    });
  });
}

function sendPacket(socket: Socket, type: number, body: string) {
  const bodyBuffer = Buffer.from(body, "utf8");
  const length = 10 + bodyBuffer.length;
  const packet = Buffer.alloc(4 + length);
  
  packet.writeInt32LE(length, 0);
  packet.writeInt32LE(1, 4); // Request ID
  packet.writeInt32LE(type, 8);
  bodyBuffer.copy(packet, 12);
  packet.writeInt16LE(0, 12 + bodyBuffer.length); // Null terminators
  
  socket.write(packet);
}
