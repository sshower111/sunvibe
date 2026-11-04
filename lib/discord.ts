import 'server-only'
import type { DiscordMessage } from './discord-messages'

// Discord notifications: posts to one channel through a Discord webhook. The webhook URL is a secret and lives
// only in the Vercel environment variable DISCORD_WEBHOOK_URL (setup: docs/ADMIN_GUIDE.md).
// DISCORD_MENTION (optional, e.g. @everyone or <@&role id>) is put in front so phones ping even when the
// channel is muted.

export const discordConfigured = () => !!process.env.DISCORD_WEBHOOK_URL

/** Never throws: a Discord problem must never fail an order or inquiry. Returns true when Discord accepted it. */
export async function postToDiscord(message: DiscordMessage) {
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url) return false
  const mention = process.env.DISCORD_MENTION?.trim()
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Sunville Bakery',
        content: mention ? `${mention} ${message.content}` : message.content,
        embeds: [message.embed],
        allowed_mentions: { parse: ['everyone', 'roles', 'users'] },
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) console.error('Discord notification failed', { status: response.status })
    return response.ok
  } catch (error) {
    console.error('Discord notification unavailable', (error as Error).message)
    return false
  }
}
