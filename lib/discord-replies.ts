import 'server-only'
import { cakeOrderStatusLabels } from './cake-order'
import { getCakeInquiry } from './cake-inquiries-store'
import { getCakeOrder } from './cake-orders-store'
import { verifiedDatabase } from './database'
import { botReady, channelFor, discordApi, discordMention, ensureThread, rememberMessage } from './discord'
import {
  DISCORD_COLORS,
  emailReplyDiscord,
  inquiryDiscord,
  orderDiscord,
  replyTarget,
  type DiscordMessage,
  type EmailReply,
} from './discord-messages'
import { SITE } from './site-info'

// Customer email replies → Discord. The Gmail script (scripts/gmail-replies-to-discord.gs) sends each new email in an
// inquiry or order conversation to /api/discord/email-reply. Every one goes in the thread under that inquiry's (or
// order's) Discord message, so the whole conversation stays in one place:
// - each customer reply pings the bakery (📩); the bakery's own emails are skipped.
// - inquiries and orders from before the bot have no message yet: their card is posted once (no ping), remembered,
//   and the thread starts there.

type Target = NonNullable<ReturnType<typeof replyTarget>>
type Starter = { channelId: string; messageId: string; customer?: string }

const isBakery = (email: string) => {
  const e = email.trim().toLowerCase()
  return (
    e === SITE.email.toLowerCase() ||
    e === (process.env.NOTIFICATION_EMAIL ?? '').trim().toLowerCase() ||
    e.endsWith('@sunvillebakerylv.com')
  )
}
const refText = (t: Target) => (t.kind === 'order' ? '#' + t.orderNo : '#' + t.ref.toUpperCase())

async function rememberedMessage(t: Target): Promise<Starter | null> {
  const sql = await verifiedDatabase('content')
  const rows =
    t.kind === 'inquiry'
      ? await sql`SELECT channel_id,message_id FROM bakery_discord_messages
          WHERE kind='inquiry' AND ref_id::text LIKE ${t.ref + '%'} ORDER BY created_at DESC LIMIT 1`
      : await sql`SELECT d.channel_id,d.message_id FROM bakery_discord_messages d
          JOIN bakery_cake_orders o ON o.id=d.ref_id WHERE d.kind='order' AND o.order_no=${t.orderNo} LIMIT 1`
  return rows[0] ? { channelId: rows[0].channel_id, messageId: rows[0].message_id } : null
}

/** Posts the inquiry's or order's card (no ping) and remembers it. null when it isn't in the database. */
async function postStarter(t: Target): Promise<Starter | null> {
  const sql = await verifiedDatabase('content')
  let card: DiscordMessage | null = null
  let customer: string | undefined
  if (t.kind === 'inquiry') {
    const rows = await sql`SELECT id FROM bakery_cake_inquiries WHERE id::text LIKE ${t.ref + '%'}
      ORDER BY created_at DESC LIMIT 1`
    const inquiry = rows[0] ? await getCakeInquiry(rows[0].id) : null
    if (inquiry) {
      card = inquiryDiscord(inquiry)
      customer = inquiry.name
    }
  } else {
    const rows = await sql`SELECT id FROM bakery_cake_orders WHERE order_no=${t.orderNo} LIMIT 1`
    const order = rows[0] ? await getCakeOrder(rows[0].id) : null
    if (order) {
      card = orderDiscord(order, cakeOrderStatusLabels[order.status] ?? order.status, '🎂', DISCORD_COLORS.reminder)
      customer = order.name
    }
  }
  if (!card?.link) return null
  const channelId = channelFor(card.channel)
  const posted = await discordApi(`/channels/${channelId}/messages`, 'POST', {
    content: card.content,
    embeds: [card.embed],
    components: card.components ?? [],
    allowed_mentions: { parse: [] },
  })
  await rememberMessage(card.link, channelId, posted.id)
  return { channelId, messageId: posted.id, customer }
}

/**
 * Returns where it went: 'thread', 'channel' (inquiry or order not found anywhere), or 'ignored' when the subject
 * names no inquiry or order. Throws when Discord or the database fails (the script retries).
 */
export async function postEmailReply(reply: EmailReply) {
  if (!botReady()) throw new Error('The Discord bot is not set up.')
  const target = replyTarget(reply.subject)
  // Only customer replies matter: the bakery answers in Gmail and doesn't need its own emails in Discord.
  if (!target || isBakery(reply.fromEmail)) return 'ignored' as const
  const message = emailReplyDiscord(reply, discordMention())
  const body = {
    content: message.content,
    embeds: [message.embed],
    allowed_mentions: { parse: ['everyone', 'roles', 'users'] },
  }
  const postInThread = async (starter: Starter) => {
    const customer = starter.customer ?? (reply.fromName || reply.fromEmail)
    const thread = await ensureThread(starter.channelId, starter.messageId, `${refText(target)} ${customer}`.trim())
    await discordApi(`/channels/${thread}/messages`, 'POST', body)
  }

  const known = await rememberedMessage(target)
  if (known) {
    try {
      await postInThread(known)
      return 'thread' as const
    } catch (error) {
      // The card was deleted in Discord (10008): post a new one below.
      if ((error as { code?: number }).code !== 10008) throw error
      const sql = await verifiedDatabase('content')
      await sql`DELETE FROM bakery_discord_messages WHERE message_id=${known.messageId}`
    }
  }
  const starter = await postStarter(target)
  if (starter) {
    await postInThread(starter)
    return 'thread' as const
  }
  await discordApi(`/channels/${channelFor(target.kind === 'order' ? 'orders' : 'inquiries')}/messages`, 'POST', body)
  return 'channel' as const
}
