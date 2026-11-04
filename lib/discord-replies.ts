import 'server-only'
import { verifiedDatabase } from './database'
import { botReady, channelFor, discordApi, discordMention, ensureThread } from './discord'
import { emailReplyDiscord, replyTarget, type EmailReply } from './discord-messages'

// Customer email replies → Discord. The Gmail script (scripts/gmail-replies-to-discord.gs) sends each new reply to
// /api/discord/email-reply. It is posted in the thread under that inquiry's (or order's) first Discord message,
// pinging the bakery; when that message isn't known (sent before the bot), it is posted on its own in the
// inquiries or orders channel.

type Found = { channelId: string; messageId: string }

async function findMessage(subject: string): Promise<{ found?: Found; channel: 'orders' | 'inquiries' }> {
  const target = replyTarget(subject)!
  const sql = await verifiedDatabase('content')
  const rows =
    target.kind === 'inquiry'
      ? await sql`SELECT channel_id,message_id FROM bakery_discord_messages
          WHERE kind='inquiry' AND ref_id::text LIKE ${target.ref + '%'} ORDER BY created_at DESC LIMIT 1`
      : await sql`SELECT d.channel_id,d.message_id FROM bakery_discord_messages d
          JOIN bakery_cake_orders o ON o.id=d.ref_id WHERE d.kind='order' AND o.order_no=${target.orderNo} LIMIT 1`
  const channel = target.kind === 'inquiry' ? 'inquiries' : 'orders'
  return rows[0] ? { found: { channelId: rows[0].channel_id, messageId: rows[0].message_id }, channel } : { channel }
}

/**
 * Returns where it went: 'thread', 'channel', or 'ignored' when the subject names no inquiry or order (other mail
 * the Gmail search let through). Throws when Discord or the database fails (the script retries).
 */
export async function postEmailReply(reply: EmailReply) {
  if (!botReady()) throw new Error('The Discord bot is not set up.')
  if (!replyTarget(reply.subject)) return 'ignored' as const
  const { found, channel } = await findMessage(reply.subject)
  const message = emailReplyDiscord(reply, discordMention())
  const body = {
    content: message.content,
    embeds: [message.embed],
    allowed_mentions: { parse: ['everyone', 'roles', 'users'] },
  }
  if (found) {
    const ref = replyTarget(reply.subject)
    const name = `${ref?.kind === 'order' ? '#' + ref.orderNo : '#' + (ref?.ref ?? '').toUpperCase()} ${reply.fromName || reply.fromEmail}`
    try {
      const thread = await ensureThread(found.channelId, found.messageId, name)
      await discordApi(`/channels/${thread}/messages`, 'POST', body)
      return 'thread' as const
    } catch (error) {
      // The message was deleted in Discord (10008): post on its own below.
      if ((error as { code?: number }).code !== 10008) throw error
    }
  }
  await discordApi(`/channels/${channelFor(channel)}/messages`, 'POST', body)
  return 'channel' as const
}
