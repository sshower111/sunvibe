import 'server-only'
import { verifiedDatabase } from './database'
import type { DiscordLink, DiscordMessage } from './discord-messages'

// Discord notifications in the bakery's channel (setup: docs/ADMIN_GUIDE.md → Discord). All values are Vercel
// environment variables, never the repo:
// - Bot (messages with buttons): DISCORD_BOT_TOKEN, DISCORD_CHANNEL_ID (orders), DISCORD_INQUIRY_CHANNEL_ID
//   (custom cake inquiries; without it they go to the orders channel), plus DISCORD_APP_ID, DISCORD_PUBLIC_KEY and
//   DISCORD_ADMIN_IDS for the buttons (lib/discord-interactions.ts).
// - Webhook (no buttons), used while the bot isn't set up: DISCORD_WEBHOOK_URL.
// DISCORD_MENTION (optional, e.g. @everyone or <@&role id>) is put in front so phones ping even when muted.

const API = 'https://discord.com/api/v10'
export const botReady = () => !!process.env.DISCORD_BOT_TOKEN && !!process.env.DISCORD_CHANNEL_ID
export const discordConfigured = () => botReady() || !!process.env.DISCORD_WEBHOOK_URL
export const channelFor = (channel: DiscordMessage['channel']) =>
  (channel === 'inquiries' && process.env.DISCORD_INQUIRY_CHANNEL_ID) || process.env.DISCORD_CHANNEL_ID!
/** Who a message pings: DISCORD_MENTION if set, otherwise everyone in DISCORD_ADMIN_IDS. */
export const discordMention = () =>
  process.env.DISCORD_MENTION?.trim() ||
  (process.env.DISCORD_ADMIN_IDS ?? '')
    .split(/[\s,]+/)
    .filter(id => /^\d+$/.test(id))
    .map(id => `<@${id}>`)
    .join(' ')

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
  const mention = message.quiet ? '' : process.env.DISCORD_MENTION?.trim()
  const payload = {
    content: mention ? `${mention} ${message.content}` : message.content,
    embeds: [message.embed],
    allowed_mentions: { parse: message.quiet ? [] : ['everyone', 'roles', 'users'] },
  }
  try {
    if (botReady()) {
      const channelId = channelFor(message.channel)
      const posted = await discordApi(`/channels/${channelId}/messages`, 'POST', {
        ...payload,
        components: message.components ?? [],
      })
      if (message.link && posted?.id)
        await rememberMessage(message.link, channelId, posted.id).catch(error =>
          console.error('Discord message not remembered', (error as Error).message),
        )
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

// The first Discord message about each order and inquiry (db/012-discord-messages.sql), so later customer email
// replies go in that message's thread.
export async function rememberMessage(link: DiscordLink, channelId: string, messageId: string) {
  const sql = await verifiedDatabase('content')
  await sql`INSERT INTO bakery_discord_messages(kind,ref_id,channel_id,message_id)
    VALUES(${link.kind},${link.id},${channelId},${messageId}) ON CONFLICT DO NOTHING`
}

/** Starts a thread under a message (or uses the one already there). Its ID is the message's ID. */
export async function ensureThread(channelId: string, messageId: string, name: string) {
  try {
    await discordApi(`/channels/${channelId}/messages/${messageId}/threads`, 'POST', {
      name: name.slice(0, 100),
      auto_archive_duration: 10080,
    })
  } catch (error) {
    if ((error as { code?: number }).code !== 160004) throw error // 160004: the thread is already there
  }
  return messageId
}
