import 'server-only'
import { orderRef, type StoredCakeOrder } from './cake-order'
import { getCakeOrder } from './cake-orders-store'
import { verifiedDatabase } from './database'
import { botReady, discordApi, ensureThread, postToDiscord } from './discord'
import { awaitingPaymentDiscord, becameOrderNote, updatedOrderMessage, type DiscordMessage } from './discord-messages'

// One Discord card per order. The first notification about an order is its card (lib/discord.ts remembers it);
// everything after (paid, reminders, …) is posted in that card's thread, and the card is redrawn with the order's
// current status, buttons and history. Admin actions redraw it too, with a line saying what was done.

export type Card = { channelId: string; messageId: string }
type Embed = { title?: string; url?: string; description?: string; color?: number; fields?: unknown[] }

export async function rememberedCard(kind: 'order' | 'inquiry', id: string): Promise<Card | null> {
  const sql = await verifiedDatabase('content')
  const rows = await sql`SELECT channel_id,message_id FROM bakery_discord_messages WHERE kind=${kind} AND ref_id=${id}`
  return rows[0] ? { channelId: rows[0].channel_id, messageId: rows[0].message_id } : null
}
async function forgetCard(card: Card) {
  const sql = await verifiedDatabase('content')
  await sql`DELETE FROM bakery_discord_messages WHERE message_id=${card.messageId}`
}
const deleted = (error: unknown) => (error as { code?: number }).code === 10008 // Unknown Message

/**
 * Deletes the Discord card of an order or inquiry and the thread under it (the order or inquiry was deleted in
 * admin). Never throws; returns false when there was a card but it could not be removed.
 */
export async function deleteCard(kind: 'order' | 'inquiry', id: string) {
  if (!botReady()) return true
  try {
    const card = await rememberedCard(kind, id)
    if (!card) return true
    const gone = (error: unknown) => [10003, 10008].includes((error as { code?: number }).code ?? 0) // already gone
    // A thread started from a message has the message's ID, and stays behind when only the message is deleted.
    // Deleting it needs the bot's Manage Threads permission; without it the thread is left and the card still goes.
    await discordApi(`/channels/${card.messageId}`, 'DELETE').catch(error => {
      if (!gone(error)) console.error('Discord thread not deleted', (error as Error).message)
    })
    await discordApi(`/channels/${card.channelId}/messages/${card.messageId}`, 'DELETE').catch(error => {
      if (!gone(error)) throw error
    })
    await forgetCard(card)
    return true
  } catch (error) {
    console.error('Discord card not deleted', (error as Error).message)
    return false
  }
}

/** History lines under the card's title; 👍 means the kitchen thread was started. */
export const historyOf = (message: { embeds?: Embed[] } | null) =>
  (message?.embeds?.[0]?.description ?? '').split('\n').filter(Boolean)
export const acknowledged = (history: string[]) => history.some(line => line.startsWith('👍'))
export const threadName = (o: StoredCakeOrder) => `${orderRef(o)} ${o.name}`

/** Redraws the order's card with its current status, adding `note` to its history. Silent when there is no card. */
export async function refreshOrderCard(orderId: string, note?: string, card?: Card | null) {
  card ??= await rememberedCard('order', orderId)
  if (!card) return
  const [message, order] = await Promise.all([
    discordApi(`/channels/${card.channelId}/messages/${card.messageId}`, 'GET'),
    getCakeOrder(orderId),
  ])
  if (!order) return
  const history = [...historyOf(message), ...(note ? [note] : [])]
  await discordApi(
    `/channels/${card.channelId}/messages/${card.messageId}`,
    'PATCH',
    updatedOrderMessage(order, history, acknowledged(history)),
  )
}

/** Same as refreshOrderCard, for code that must never fail because of Discord (admin actions). */
export async function refreshOrderCardQuietly(orderId: string, note?: string) {
  if (!botReady()) return
  await refreshOrderCard(orderId, note).catch(error =>
    console.error('Discord order card not updated', (error as Error).message),
  )
}

/**
 * Sends a notification to Discord. Never throws. An order that already has a card gets it as a line in the card's
 * thread (pinging unless quiet) and a redrawn card; anything else is posted as usual (and becomes the card).
 */
export async function postNotification(message: DiscordMessage) {
  if (!botReady() || message.link?.kind !== 'order') return postToDiscord(message)
  try {
    const card = await rememberedCard('order', message.link.id)
    const order = card ? await getCakeOrder(message.link.id) : null
    if (!card || !order) return postToDiscord(message)
    const mention = message.quiet ? '' : process.env.DISCORD_MENTION?.trim()
    try {
      const thread = await ensureThread(card.channelId, card.messageId, threadName(order))
      await discordApi(`/channels/${thread}/messages`, 'POST', {
        content: mention ? `${mention} ${message.content}` : message.content,
        allowed_mentions: { parse: message.quiet ? [] : ['everyone', 'roles', 'users'] },
      })
    } catch (error) {
      if (!deleted(error)) throw error
      await forgetCard(card) // the card was deleted in Discord: this message becomes the new card
      return postToDiscord(message)
    }
    await refreshOrderCard(order.id, undefined, card)
    return true
  } catch (error) {
    console.error('Discord notification unavailable', (error as Error).message)
    return false
  }
}

/**
 * An inquiry became an order (its pay link was just emailed): posts the order's card without a ping, and adds a
 * quiet line to the inquiry's card linking to it. Never throws.
 */
export async function inquiryBecameOrder(order: StoredCakeOrder) {
  if (!botReady()) return
  try {
    await postToDiscord(awaitingPaymentDiscord(order))
    const [orderCard, inquiryCard] = await Promise.all([
      rememberedCard('order', order.id),
      order.inquiryId ? rememberedCard('inquiry', order.inquiryId) : null,
    ])
    if (!orderCard || !inquiryCard) return
    const channel = await discordApi(`/channels/${orderCard.channelId}`, 'GET')
    const link = `https://discord.com/channels/${channel.guild_id}/${orderCard.channelId}/${orderCard.messageId}`
    const message = await discordApi(`/channels/${inquiryCard.channelId}/messages/${inquiryCard.messageId}`, 'GET')
    const embed: Embed = message?.embeds?.[0] ?? {}
    const history = [...historyOf(message), becameOrderNote(order, link)]
    await discordApi(`/channels/${inquiryCard.channelId}/messages/${inquiryCard.messageId}`, 'PATCH', {
      embeds: [
        {
          title: embed.title,
          url: embed.url,
          color: 0x2ecc71,
          fields: embed.fields,
          description: history.join('\n').slice(0, 4000),
        },
      ],
    })
  } catch (error) {
    console.error('Discord inquiry → order not shown', (error as Error).message)
  }
}
