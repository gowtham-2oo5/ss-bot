import {
    Events,
    EmbedBuilder,
    PermissionsBitField,
    type Client,
    type Message,
} from "discord.js";
import { getConfig } from "./db";
import { addWarn, getWarns, deleteAllWarns } from "./warns";

export function setupPrefix(client: Client) {
    client.on(Events.MessageCreate, async (message: Message) => {
        if (message.author.bot || !message.guild) return;

        const prefix = getConfig("prefix") || "!";
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/\s+/);
        const cmd = args.shift()?.toLowerCase();
        if (!cmd) return;

        const isMod = message.member?.permissions.has(
            PermissionsBitField.Flags.ManageGuild,
        );

        switch (cmd) {
            case "help": {
                const embed = new EmbedBuilder()
                    .setTitle("Shadow Seneschal — Help")
                    .setDescription(
                        `Use \`/help\` for the full interactive directory.\n\nPrefix: \`${prefix}\``,
                    )
                    .setColor(0x5865f2)
                    .addFields(
                        {
                            name: "🛡️ Moderation",
                            value: "`warn`, `warns`, `delwarn`, `kick`, `ban`, `timeout`",
                        },
                        {
                            name: "📊 General",
                            value: "`serverstats`, `ping`, `help`",
                        },
                    )
                    .setFooter({
                        text: "Use slash commands for full functionality",
                    })
                    .setTimestamp();
                await message.reply({ embeds: [embed] });
                break;
            }
            case "warn": {
                if (!isMod) break;
                const target = message.mentions.members?.first();
                if (!target) {
                    await message.reply(
                        "Usage: `" + prefix + "warn @user reason`",
                    );
                    break;
                }
                const reason = args.slice(1).join(" ") || "No reason provided";
                const warn = addWarn(target.id, message.author.id, reason);
                await target
                    .send({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(
                                    `⚠️ You were warned in ${message.guild.name}`,
                                )
                                .setColor(0xfee75c)
                                .addFields(
                                    { name: "Reason", value: reason },
                                    {
                                        name: "Warned by",
                                        value: `<@${message.author.id}>`,
                                    },
                                    {
                                        name: "Mistaken?",
                                        value: "Contact the owner: `first_knight780` on Discord",
                                    },
                                )
                                .setTimestamp(),
                        ],
                    })
                    .catch(() => {});
                await message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("⚠️ User Warned")
                            .setColor(0xfee75c)
                            .addFields(
                                {
                                    name: "User",
                                    value: `<@${target.id}>`,
                                    inline: true,
                                },
                                { name: "Reason", value: reason },
                                {
                                    name: "Warn ID",
                                    value: `\`${warn.id}\``,
                                    inline: true,
                                },
                            )
                            .setTimestamp(),
                    ],
                });
                break;
            }
            case "warns": {
                if (!isMod) break;
                const target = message.mentions.members?.first();
                if (!target) {
                    await message.reply("Usage: `" + prefix + "warns @user`");
                    break;
                }
                const warns = getWarns(target.id);
                if (!warns.length) {
                    await message.reply(`✅ <@${target.id}> has no warns.`);
                    break;
                }
                const list = warns
                    .map(
                        (w, i) =>
                            `${i + 1}. \`${w.id}\` — ${w.reason} (<t:${Math.floor(w.timestamp / 1000)}:R>)`,
                    )
                    .join("\n");
                await message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`📋 Warns for ${target.user.username}`)
                            .setDescription(list)
                            .setColor(0xfee75c)
                            .setFooter({ text: `${warns.length} warn(s)` })
                            .setTimestamp(),
                    ],
                });
                break;
            }
            case "kick": {
                if (!isMod) break;
                const target = message.mentions.members?.first();
                if (!target) {
                    await message.reply(
                        "Usage: `" + prefix + "kick @user [reason]`",
                    );
                    break;
                }
                const reason = args.slice(1).join(" ") || "No reason provided";
                await target
                    .send({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(
                                    `👢 You were kicked from ${message.guild.name}`,
                                )
                                .setColor(0xed4245)
                                .addFields({ name: "Reason", value: reason })
                                .setTimestamp(),
                        ],
                    })
                    .catch(() => {});
                await target.kick(reason);
                await message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("👢 User Kicked")
                            .setColor(0xed4245)
                            .addFields(
                                {
                                    name: "User",
                                    value: `<@${target.id}>`,
                                    inline: true,
                                },
                                { name: "Reason", value: reason },
                            )
                            .setTimestamp(),
                    ],
                });
                break;
            }
            case "ban": {
                if (!isMod) break;
                const target = message.mentions.users?.first();
                if (!target) {
                    await message.reply(
                        "Usage: `" + prefix + "ban @user [reason]`",
                    );
                    break;
                }
                const reason = args.slice(1).join(" ") || "No reason provided";
                await target
                    .send({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(
                                    `🔨 You were banned from ${message.guild.name}`,
                                )
                                .setColor(0xed4245)
                                .addFields({ name: "Reason", value: reason })
                                .setTimestamp(),
                        ],
                    })
                    .catch(() => {});
                await message.guild.members.ban(target, { reason });
                await message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("🔨 User Banned")
                            .setColor(0xed4245)
                            .addFields(
                                {
                                    name: "User",
                                    value: `<@${target.id}>`,
                                    inline: true,
                                },
                                { name: "Reason", value: reason },
                            )
                            .setTimestamp(),
                    ],
                });
                break;
            }
            case "timeout": {
                if (!isMod) break;
                const target = message.mentions.members?.first();
                if (!target) {
                    await message.reply(
                        "Usage: `" + prefix + "timeout @user 5m [reason]`",
                    );
                    break;
                }
                const durationStr = args[1];
                const reason = args.slice(2).join(" ") || "No reason provided";
                const match = durationStr?.match(/^(\d+)(m|h|d)$/);
                if (!match) {
                    await message.reply("Duration format: `5m`, `1h`, `1d`");
                    break;
                }
                const ms =
                    Number(match[1]) *
                    { m: 60000, h: 3600000, d: 86400000 }[
                        match[2] as "m" | "h" | "d"
                    ];
                await target.timeout(ms, reason);
                await target
                    .send({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(
                                    `⏱️ You were timed out in ${message.guild.name}`,
                                )
                                .setColor(0xf0b232)
                                .addFields(
                                    {
                                        name: "Duration",
                                        value: durationStr,
                                        inline: true,
                                    },
                                    { name: "Reason", value: reason },
                                )
                                .setTimestamp(),
                        ],
                    })
                    .catch(() => {});
                await message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("⏱️ User Timed Out")
                            .setColor(0xf0b232)
                            .addFields(
                                {
                                    name: "User",
                                    value: `<@${target.id}>`,
                                    inline: true,
                                },
                                {
                                    name: "Duration",
                                    value: durationStr,
                                    inline: true,
                                },
                                { name: "Reason", value: reason },
                            )
                            .setTimestamp(),
                    ],
                });
                break;
            }
            case "serverstats": {
                const guild = message.guild;
                const online = guild.members.cache.filter(
                    (m) => m.presence?.status === "online",
                ).size;
                const embed = new EmbedBuilder()
                    .setTitle(`📊 ${guild.name}`)
                    .setColor(0x5865f2)
                    .addFields(
                        {
                            name: "Members",
                            value: `${guild.memberCount}`,
                            inline: true,
                        },
                        { name: "Online", value: `${online}`, inline: true },
                        {
                            name: "Roles",
                            value: `${guild.roles.cache.size - 1}`,
                            inline: true,
                        },
                        {
                            name: "Channels",
                            value: `${guild.channels.cache.size}`,
                            inline: true,
                        },
                    )
                    .setTimestamp();
                await message.reply({ embeds: [embed] });
                break;
            }
            case "purge": {
                if (!isMod) break;
                const count = parseInt(args[0]);
                if (!count || count < 1 || count > 100) {
                    await message.reply("Usage: `" + prefix + "purge 1-100`");
                    break;
                }
                await message.delete().catch(() => {});
                const deleted = await (message.channel as any).bulkDelete(
                    count,
                    true,
                );
                const reply = await message.channel.send(
                    `🗑️ Deleted **${deleted.size}** message(s).`,
                );
                setTimeout(() => reply.delete().catch(() => {}), 100);
                break;
            }
            case "ping": {
                const sent = await message.reply("Pinging...");
                await sent.edit(
                    `Pong! \`${sent.createdTimestamp - message.createdTimestamp}ms\``,
                );
                break;
            }
            default:
                break;
        }
    });
}
