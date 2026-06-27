# Privacy Policy

**Last updated:** June 27, 2026

---

## 1. Scope

This Privacy Policy applies to Shadow Seneschal ("the Bot"), a private Discord bot operating exclusively within a single Discord server ("The Sanctuary").

## 2. Data We Collect

### Stored in Database

| Data | Purpose | Retention |
|------|---------|-----------|
| User ID | Associate warnings and jail state with a user | Until warns are deleted or user is unjailed |
| Moderator ID | Record who issued a moderation action | Same as above |
| Warning reason & timestamp | Moderation records | Until manually deleted by staff |
| Jail role backup | Restore roles when unjailed | Cleared upon unjail |
| Channel IDs (config) | Know where to send welcome/farewell/poll messages | Until reconfigured |
| Poll message IDs & options | Track active polls | Deleted when poll ends |

### Processed but NOT Stored

| Data | Purpose |
|------|---------|
| Message content | Scanned for banned words by automod; deleted messages are not logged |
| Presence status (online/idle/dnd/offline) | Aggregated for server stats; individual status is never stored |
| Member count & channel counts | Broadcast via WebSocket for dashboard; computed live, not persisted |

### Not Collected

- Message history or logs
- Voice activity
- DM content
- IP addresses
- Personal information beyond Discord user IDs

## 3. How Data Is Stored

All data is stored locally in a SQLite database file (`data/ss-bot.db`) on the server hosting the Bot. It is not transmitted to any third-party service, cloud database, or analytics platform.

## 4. Data Sharing

We do **not** share, sell, or transmit your data to any third party. The stats WebSocket/REST endpoint exposes only aggregate server-level counts (total members, online count, etc.) — never individual user data.

## 5. Data Retention

- **Warnings**: Retained until explicitly deleted by a moderator using `/delwarn`.
- **Jail role backups**: Cleared immediately upon unjail.
- **Poll data**: Deleted when the poll ends.
- **Automod strikes**: In-memory only; reset when the Bot restarts.
- **Config settings**: Retained indefinitely (channel IDs, not user data).

## 6. Your Rights

As a member of The Sanctuary, you may:

- **Request your data**: Ask a moderator to run `/warns` to see your warning records.
- **Request deletion**: Ask a moderator to clear your warnings using `/delwarn`.
- **Leave**: Leaving the server means the Bot can no longer interact with you. Stored warn data remains unless manually deleted by staff.

## 7. Children's Privacy

The Bot does not knowingly collect data from users under 13. Discord's own Terms of Service require users to be at least 13 years old.

## 8. Security

The database is stored on a private server with access restricted to the Bot operator. No remote access to the database is provided to third parties.

## 9. Changes

This policy may be updated at any time. Changes take effect immediately upon posting.

## 10. Contact

For privacy-related questions or data requests, contact the server owner:
- Discord: `first_knight780`
