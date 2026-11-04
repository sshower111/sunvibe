import 'server-only'
import { createPublicKey, verify } from 'node:crypto'
import { approveOrder, askKitchen, declineOrder, getCakeOrderSettled } from './cake-order-actions'
import { amountDueNow, cakeOrderStatusLabels, kitchenText, orderRef, type StoredCakeOrder } from './cake-order'
import { getCakeOrder } from './cake-orders-store'
import { discordApi } from './discord'
import { confirmPrompt, parseButton, updatedOrderMessage } from './discord-messages'

// Buttons on the Discord order messages (app/api/discord/interactions). Discord sends each press here, signed with
// the app's key (DISCORD_PUBLIC_KEY). Only Discord users in DISCORD_ADMIN_IDS may use them.
// Discord wants an answer within 3 seconds, so every press is answered right away and the work (database, Square,
// emails, Discord edits) runs just after, through `later`.
//
// 👍 Acknowledge  → opens a thread under the order with the Chinese kitchen text; an order waiting on approval
//                   becomes "Checking with kitchen" (same as Ask kitchen in admin).
// ✅ Approve      → asks "Charge Jane $45?" (only the presser sees it) → Yes charges and emails, like admin Approve.
// ❌ Decline      → asks first → Yes releases the card hold and emails the customer, like admin Decline.

type DiscordUser = { id: string; username: string; global_name?: string | null }
export type Interaction = {
  type: number
  application_id: string
  token: string
  channel_id?: string
  member?: { nick?: string | null; user: DiscordUser }
  user?: DiscordUser
  data?: { custom_id?: string }
  message?: { id: string; channel_id?: string; embeds?: { description?: string }[]; thread?: { id: string } }
}
type Later = (work: () => Promise<void>) => void

const EPHEMERAL = 64
const PONG = 1
const REPLY = 4
const DEFERRED_REPLY = 5
const DEFERRED_UPDATE = 6
const UPDATE = 7
const reply = (content: string) => ({ type: REPLY, data: { content, flags: EPHEMERAL } })

const SPKI_ED25519 = Buffer.from('302a300506032b6570032100', 'hex')
/** Discord's Ed25519 signature over timestamp + body; requests older than 5 minutes are refused. */
export function verifyDiscordRequest(
  publicKeyHex: string,
  signatureHex: string | null,
  timestamp: string | null,
  body: string,
  now = Date.now(),
) {
  if (!signatureHex || !timestamp || !/^\d+$/.test(timestamp)) return false
  if (Math.abs(now / 1000 - Number(timestamp)) > 300) return false
  try {
    const key = createPublicKey({
      key: Buffer.concat([SPKI_ED25519, Buffer.from(publicKeyHex, 'hex')]),
      format: 'der',
      type: 'spki',
    })
    return verify(null, Buffer.from(timestamp + body), key, Buffer.from(signatureHex, 'hex'))
  } catch {
    return false
  }
}

export const discordAdminIds = () => (process.env.DISCORD_ADMIN_IDS ?? '').split(/[\s,]+/).filter(Boolean)

/** The answer Discord gets right away. Work that takes longer is handed to `later`. */
export async function handleInteraction(i: Interaction, later: Later) {
  if (i.type === 1) return { type: PONG }
  if (i.type !== 3) return reply('Not supported.')
  const user = i.member?.user ?? i.user
  if (!user || !discordAdminIds().includes(user.id))
    return reply('Not allowed. Ask the owner to add your Discord ID to DISCORD_ADMIN_IDS.')
  const button = parseButton(i.data?.custom_id ?? '')
  if (!button || !i.message) return reply('This button is no longer used.')
  const who = i.member?.nick || user.global_name || user.username
  const { action, orderId } = button

  if (action === 'cancel') return { type: UPDATE, data: { content: 'Cancelled. Nothing changed.', components: [] } }
  if (action === 'ack') {
    later(() => acknowledge(i, orderId, who))
    return { type: DEFERRED_UPDATE }
  }
  if (action === 'approve' || action === 'decline') {
    const messageId = i.message.id
    later(() => askToConfirm(i, orderId, action, messageId))
    return { type: DEFERRED_REPLY, data: { flags: EPHEMERAL } }
  }
  later(() => answer(i, orderId, action, button.messageId, who))
  return {
    type: UPDATE,
    data: { content: action === 'approve-yes' ? '⏳ Approving…' : '⏳ Declining…', components: [] },
  }
}

// --- the work after the answer ---

const money = (n: number) => '$' + (Number.isInteger(n) ? n : n.toFixed(2))
const channelOf = (i: Interaction) => i.channel_id ?? i.message?.channel_id ?? process.env.DISCORD_CHANNEL_ID!
const notesOf = (message?: { embeds?: { description?: string }[] }) =>
  (message?.embeds?.[0]?.description ?? '').split('\n').filter(Boolean)
const waiting = (o: StoredCakeOrder) => ['awaiting_approval', 'checking_kitchen', 'hold_expired'].includes(o.status)

/** Edits the message the button is on (or the deferred "thinking" reply). */
const editOriginal = (i: Interaction, body: unknown) =>
  discordApi(`/webhooks/${i.application_id}/${i.token}/messages/@original`, 'PATCH', body, 'none')
const tellPresser = (i: Interaction, content: string) =>
  discordApi(`/webhooks/${i.application_id}/${i.token}`, 'POST', { content, flags: EPHEMERAL }, 'none')

/** Redraws the order message in the channel with the order's current status, adding `note` to its history. */
async function refreshOrderMessage(channelId: string, messageId: string, orderId: string, note?: string) {
  const [message, order] = await Promise.all([
    discordApi(`/channels/${channelId}/messages/${messageId}`, 'GET'),
    getCakeOrder(orderId),
  ])
  if (!order) return
  const notes = [...notesOf(message), ...(note ? [note] : [])]
  await discordApi(
    `/channels/${channelId}/messages/${messageId}`,
    'PATCH',
    updatedOrderMessage(order, notes, !!message?.thread),
  )
}

async function acknowledge(i: Interaction, orderId: string, who: string) {
  const channelId = channelOf(i)
  const messageId = i.message!.id
  try {
    let order = await getCakeOrderSettled(orderId)
    if (!order) throw new Error('Order not found.')
    let note = `👍 Acknowledged by ${who}`
    if (order.status === 'awaiting_approval') {
      order = { ...order, ...(await askKitchen(orderId)) }
      note += ' · checking with kitchen'
    }
    try {
      await discordApi(`/channels/${channelId}/messages/${messageId}/threads`, 'POST', {
        name: `${orderRef(order)} ${order.name} · kitchen`.slice(0, 100),
        auto_archive_duration: 1440,
      })
    } catch (error) {
      if ((error as { code?: number }).code !== 160004) throw error // 160004: the thread is already there
    }
    // A thread started from a message has the same ID as the message.
    await discordApi(`/channels/${messageId}/messages`, 'POST', { content: kitchenText(order) })
    await editOriginal(i, updatedOrderMessage(order, [...notesOf(i.message), note], true))
  } catch (error) {
    console.error('Discord acknowledge failed', (error as Error).message)
    await tellPresser(i, '⚠️ ' + (error as Error).message).catch(() => {})
  }
}

async function askToConfirm(i: Interaction, orderId: string, action: 'approve' | 'decline', messageId: string) {
  try {
    const order = await getCakeOrderSettled(orderId)
    if (!order) return void (await editOriginal(i, { content: 'Order not found.' }))
    if (!waiting(order)) {
      await editOriginal(i, {
        content: `${orderRef(order)} is already **${cakeOrderStatusLabels[order.status]}**. Nothing changed.`,
      })
      await refreshOrderMessage(channelOf(i), messageId, orderId)
      return
    }
    await editOriginal(i, confirmPrompt(order, action, messageId))
  } catch (error) {
    console.error('Discord confirm failed', (error as Error).message)
    await editOriginal(i, { content: '⚠️ ' + (error as Error).message }).catch(() => {})
  }
}

async function answer(
  i: Interaction,
  orderId: string,
  action: 'approve-yes' | 'decline-yes',
  messageId: string | undefined,
  who: string,
) {
  const channelId = channelOf(i)
  let note: string | undefined
  try {
    if (action === 'approve-yes') {
      const result = await approveOrder(orderId)
      const order = await getCakeOrder(orderId)
      note =
        result.status === 'paid'
          ? `✅ Approved by ${who} · charged ${order ? money(amountDueNow(order)) : ''}${order?.test ? ' (test, no card)' : ''}`
          : `✅ Approved by ${who} · pay link ${result.emailed ? 'emailed' : 'not emailed — resend from admin'}`
    } else {
      await declineOrder(orderId, true)
      note = `❌ Declined by ${who} · card hold released, customer emailed`
    }
    await editOriginal(i, { content: note, components: [] })
  } catch (error) {
    console.error('Discord approve/decline failed', (error as Error).message)
    await editOriginal(i, { content: '⚠️ ' + (error as Error).message, components: [] }).catch(() => {})
  }
  if (messageId)
    await refreshOrderMessage(channelId, messageId, orderId, note).catch(error =>
      console.error('Discord message refresh failed', (error as Error).message),
    )
}
