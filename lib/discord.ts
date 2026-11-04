import 'server-only'
import type { DiscordMessage } from './discord-messages'

// Discord notifications in the bakery's channel (setup: docs/ADMIN_GUIDE.md → Discord). All values are Vercel
// environment variables, never the repo:
// - Bot (messages with buttons): DISCORD_BOT_TOKEN, DISCORD_CHANNEL_ID, plus DISCORD_APP_ID, DISCORD_PUBLIC_KEY and
//   DISCORD_ADMIN_IDS for the buttons (lib/discord-interactions.ts).
// - Webhook (no buttons), used while the bot isn't set up: DISCORD_WEBHOOK_URL.
// DISCORD_MENTION (optional, e.g. @everyone or <@&role id>) is put in front so phones ping even when muted.

const API = 'https://discord.com/api/v10'
const botReady = () => !!process.env.DISCORD_BOT_TOKEN && !!process.env.DISCORD_CHANNEL_ID
export const discordConfigured = () => botReady() || !!process.env.DISCORD_WEBHOOK_URL

/** Discord REST call. auth: 'bot' uses the bot token; 'none' for interaction webhooks (their token is in the path). */
export async function discordApi(path: string, method: string, body?: unknown, auth: 'bot' | 'none' = 'bot') {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth === 'bot') headers.Authorization = 'Bot ' + process.env.DISCORD_BOT_TOKEN
  const response = await fetch(API + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) {
    const code = (data as { code?: number } | null)?.code
    throw Object.assign(new Error(`Discord ${method} ${path.split('/')[1]} failed (${response.status})`), { code })
  }
  return data
}

/** Never throws: a Discord problem must never fail an order or inquiry. Returns true when Discord accepted it. */
export async function postToDiscord(message: DiscordMessage) {
  const webhook = process.env.DISCORD_WEBHOOK_URL
  if (!botReady() && !webhook) return false
  const mention = process.env.DISCORD_MENTION?.trim()
  const payload = {
    content: mention ? `${mention} ${message.content}` : message.content,
    embeds: [message.embed],
    allowed_mentions: { parse: ['everyone', 'roles', 'users'] },
  }
  try {
    if (botReady()) {
      await discordApi(`/channels/${process.env.DISCORD_CHANNEL_ID}/messages`, 'POST', {
        ...payload,
        components: message.components ?? [],
      })
      return true
    }
    const response = await fetch(webhook!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Sunville Bakery', ...payload }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) console.error('Discord notification failed', { status: response.status })
    return response.ok
  } catch (error) {
    console.error('Discord notification unavailable', (error as Error).message)
    return false
  }
}
