# Shadow Seneschal

A private Discord bot built for **The Sanctuary** server. Handles moderation, welcome/farewell messages, polls, automod, reaction roles, and exposes real-time server stats via WebSocket.

Built with [discord.js](https://discord.js.org/) v14 and [Bun](https://bun.sh/).

---

## Features

### Moderation
| Command | Description |
|---------|-------------|
| `/ban` | Ban a user with optional reason |
| `/kick` | Kick a user with optional reason |
| `/timeout` | Timeout a user (1m to 1w presets) |
| `/warn` | Issue a warning (stored in DB) |
| `/warns` | View all warns for a user |
| `/delwarn` | Delete specific or all warns via dropdown |
| `/jail` | Strip all roles, assign Jailed role, restrict to jail channel |
| `/unjail` | Restore original roles and remove jail |
| `/set-jail-channel` | Configure the jail text channel |

### General
| Command | Description |
|---------|-------------|
| `/serverstats` | Display server statistics (members, presence, channels, boosts) |
| `/roles` | Browse members by role via dropdown |
| `/poll` | Create a reaction poll with role pings and optional duration |
| `/poll-end` | Manually end an active poll and show results |
| `/set-poll-channel` | Set the channel where polls are posted |
| `/set-welcome-channel` | Set the welcome message channel |
| `/set-farewell-channel` | Set the farewell message channel |

### Automod
- Deletes messages containing blacklisted words (configurable via `BANNED_WORDS` env)
- Leet-speak normalization to catch bypass attempts (`ph` → `f`, `0` → `o`, etc.)
- Strike tracking with DM warnings (3 strikes before escalation notice)

### Welcome & Farewell
- Themed embed in the welcome channel when a member joins
- DM to new members with server rules, website link, and invite link
- Farewell embed when a member leaves
- DM to departing members with owner contact info

### Reaction Roles
- Members react to a designated message to self-assign roles
- Unreacting removes the role
- Configured per-server via the bot's role message setup

### Real-Time API
- `GET /stats` — JSON snapshot of server statistics
- `WS /ws` — WebSocket stream, broadcasts on presence/member changes

---

## Tech Stack

- **Runtime**: Bun
- **Library**: discord.js v14
- **Database**: SQLite (via `bun:sqlite`)
- **Language**: TypeScript

---

## Setup

### Prerequisites
- [Bun](https://bun.sh/) installed
- A Discord bot application with the following intents enabled:
  - Server Members
  - Message Content
  - Presence

### Installation

```bash
git clone <repo-url> && cd ss-bot
bun install
```

### Configuration

Copy `.env.example` to `.env` and fill in:

```env
DISCORD_TOKEN=your-bot-token
CLIENT_ID=your-application-id
GUILD_ID=your-server-id
PORT=3001
INVITE_LINK=https://discord.gg/your-invite
MAIN_ROLES=role_id_1,role_id_2,role_id_3
BANNED_WORDS=word1,word2,word3
```

### Deploy Commands

```bash
bun run deploy
```

### Run

```bash
bun run start
```

---

## Project Structure

```
ss-bot/
├── index.ts                  # Entry point, client setup, command loader
├── deploy-commands.ts        # Registers slash commands to Discord
├── src/
│   ├── commands/
│   │   ├── general/          # serverstats, roles, poll, set-* commands
│   │   └── mod/              # ban, kick, timeout, warn, jail, etc.
│   └── modules/
│       ├── automod.ts        # Message filtering & strike system
│       ├── db.ts             # SQLite setup & config helpers
│       ├── server.ts         # HTTP + WebSocket server (Bun.serve)
│       ├── warns.ts          # Warn CRUD operations
│       └── welcome.ts        # Join/leave embeds & DMs
├── data/
│   └── ss-bot.db             # SQLite database (auto-created)
└── tests/
```

---

## Scope

This bot is designed for and deployed exclusively on **one specific Discord server** (The Sanctuary). It is not a public bot and does not operate on multiple guilds.

---

## License

Private. Not licensed for redistribution.
