import type { Client, Guild } from "discord.js";

const WS_CLIENTS = new Set<any>();
let cachedStats: any = null;
let guildRef: Guild | null = null;

function getStats(guild: Guild) {
  const total = guild.memberCount;
  const online = guild.members.cache.filter((m) => m.presence?.status === "online").size;
  const idle = guild.members.cache.filter((m) => m.presence?.status === "idle").size;
  const dnd = guild.members.cache.filter((m) => m.presence?.status === "dnd").size;
  const offline = total - online - idle - dnd;
  const bots = guild.members.cache.filter((m) => m.user.bot).size;

  return {
    name: guild.name,
    icon: guild.iconURL(),
    id: guild.id,
    totalMembers: total,
    humans: total - bots,
    bots,
    online,
    idle,
    dnd,
    offline,
    textChannels: guild.channels.cache.filter((c) => c.isTextBased() && !c.isVoiceBased()).size,
    voiceChannels: guild.channels.cache.filter((c) => c.isVoiceBased()).size,
    roles: guild.roles.cache.size - 1,
    boostLevel: guild.premiumTier,
    boostCount: guild.premiumSubscriptionCount ?? 0,
    createdAt: guild.createdTimestamp,
  };
}

function broadcastStats() {
  if (!guildRef) return;
  cachedStats = getStats(guildRef);
  const payload = JSON.stringify(cachedStats);
  for (const ws of WS_CLIENTS) {
    ws.send(payload);
  }
}

export function startServer(client: Client) {
  const guildId = process.env.GUILD_ID!;

  client.once("clientReady", () => {
    guildRef = client.guilds.cache.get(guildId) ?? null;
    if (guildRef) cachedStats = getStats(guildRef);
  });

  // Broadcast on presence/member changes
  client.on("presenceUpdate", () => broadcastStats());
  client.on("guildMemberAdd", () => broadcastStats());
  client.on("guildMemberRemove", () => broadcastStats());

  const port = Number(process.env.PORT) || 3001;

  Bun.serve({
    port,
    fetch(req, server) {
      const url = new URL(req.url);

      // WebSocket upgrade
      if (url.pathname === "/ws") {
        if (server.upgrade(req)) return;
        return new Response("WebSocket upgrade failed", { status: 400 });
      }

      // REST endpoint
      if (url.pathname === "/stats") {
        return Response.json(cachedStats ?? { error: "not ready" });
      }

      return new Response("Shadow Seneschal API", { status: 200 });
    },
    websocket: {
      open(ws) {
        WS_CLIENTS.add(ws);
        if (cachedStats) ws.send(JSON.stringify(cachedStats));
      },
      close(ws) {
        WS_CLIENTS.delete(ws);
      },
      message() {},
    },
  });

  console.log(`🌐 API running on http://localhost:${port} (REST: /stats | WS: /ws)`);
}
