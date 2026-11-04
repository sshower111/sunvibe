import {
  cakeOrderStatusLabels,
  formatPickupDate,
  formatPickupTime,
  isDelivery,
  orderRef,
  sizeLabel,
  type StoredCakeOrder,
} from './cake-order'
import { inquiryRef, type StoredCakeInquiry } from './cake-inquiry'
import { SITE_URL } from './seo'

// What the Discord notifications look like: one message per event in the bakery's Discord channel,
// a short line on top (what the phone shows) and a card with the details. Sent by lib/discord.ts.

export type DiscordField = { name: string; value: string; inline?: boolean }
export type DiscordEmbed = {
  title: string
  url?: string
  description?: string
  color?: number
  fields?: DiscordField[]
}
export type DiscordButton = {
  type: 2
  /** 1 blue, 2 grey, 3 green, 4 red */
  style: 1 | 2 | 3 | 4
  label: string
  emoji?: { name: string }
  custom_id: string
}
export type DiscordRow = { type: 1; components: DiscordButton[] }
/** components: buttons, only shown when the site posts as its Discord bot (webhooks can't have buttons). */
export type DiscordMessage = { content: string; embed: DiscordEmbed; components?: DiscordRow[] }

export const DISCORD_COLORS = {
  approval: 0xf5a623,
  paid: 0x2ecc71,
  inquiry: 0x5865f2,
  pickup: 0xe67e22,
  urgent: 0xe74c3c,
  reminder: 0x95a5a6,
} as const

// Discord limits: title 256, field value 1024, description 4096.
const cut = (text: string, max: number) => (text.length > max ? text.slice(0, max - 1) + '…' : text)
const field = (name: string, value: string | undefined, inline = false): DiscordField[] =>
  value && value.trim() ? [{ name, value: cut(value.trim(), 1024), inline }] : []
const money = (n: number) => '$' + (Number.isInteger(n) ? n : n.toFixed(2))
const absolute = (path: string) => SITE_URL + path

function orderFields(o: StoredCakeOrder): DiscordField[] {
  const delivery = isDelivery(o)
  const paid =
    o.deposit && o.status === 'deposit_paid'
      ? `${money(o.price)} (deposit ${money(o.deposit)} paid, ${money(o.price - o.deposit)} due)`
      : money(o.price)
  return [
    ...field('👤 Customer', o.name, true),
    ...field('📞 Phone', o.phone, true),
    ...field(
      delivery ? '🚚 Delivery' : '📅 Pickup',
      `${formatPickupDate(o.pickupDate)} · ${formatPickupTime(o.pickupTime)}`,
      true,
    ),
    ...field('🎂 Cake', `${sizeLabel(o.size)} · ${o.flavor} / ${o.filling}`),
    ...field('✍️ Writing on cake', o.cakeMessage),
    ...field('📝 Notes', o.notes),
    ...(delivery ? field('📍 Address', `${o.fulfillment}\n${o.deliveryAddress ?? ''}`) : []),
    ...field('💵 Total', paid, true),
    ...field('📌 Status', cakeOrderStatusLabels[o.status] ?? o.status, true),
  ]
}

/** headline: "Needs approval", "New paid cake order", "Pickup in 1 hour", ... */
export function orderDiscord(
  o: StoredCakeOrder,
  headline: string,
  emoji: string,
  color: number,
  urgent = false,
): DiscordMessage {
  const test = o.test ? '[TEST] ' : ''
  const title = `${test}${emoji} ${headline} · ${orderRef(o)}`
  return {
    content: cut(`${urgent ? '🚨 **URGENT** · ' : ''}**${title}** — ${o.name}`, 1900),
    embed: {
      title: cut(title, 256),
      url: absolute(`/admin/orders/${o.id}`),
      color: urgent ? DISCORD_COLORS.urgent : color,
      fields: orderFields(o),
    },
    components: orderButtons(o),
  }
}

// Buttons on order messages. custom_id is "<action>:<order id>"; the confirm step adds ":<message id>".
// Acknowledge opens a thread under the message with the Chinese kitchen text (and, for an order waiting on
// approval, marks it "Checking with kitchen"). Approve and Decline ask to confirm first (lib/discord-interactions.ts).
export type ButtonAction = 'ack' | 'approve' | 'decline' | 'approve-yes' | 'decline-yes' | 'cancel'
const button = (style: DiscordButton['style'], label: string, emoji: string, id: string): DiscordButton => ({
  type: 2,
  style,
  label,
  emoji: { name: emoji },
  custom_id: id,
})
const ACKABLE = ['awaiting_approval', 'checking_kitchen', 'paid', 'deposit_paid']
const ANSWERABLE = ['awaiting_approval', 'checking_kitchen', 'hold_expired']

/** acknowledged: the message already has its kitchen thread. */
export function orderButtons(o: Pick<StoredCakeOrder, 'id' | 'status'>, acknowledged = false): DiscordRow[] {
  const buttons: DiscordButton[] = []
  if (!acknowledged && ACKABLE.includes(o.status)) buttons.push(button(2, 'Acknowledge', '👍', 'ack:' + o.id))
  if (ANSWERABLE.includes(o.status)) {
    buttons.push(
      button(3, o.status === 'hold_expired' ? 'Approve (send pay link)' : 'Approve & charge', '✅', 'approve:' + o.id),
      button(4, 'Decline', '❌', 'decline:' + o.id),
    )
  }
  return buttons.length ? [{ type: 1, components: buttons }] : []
}

/** "approve-yes:<order id>:<message id>" → its parts; null for anything else. */
export function parseButton(customId: string) {
  const [action, orderId, messageId] = customId.split(':')
  const actions: ButtonAction[] = ['ack', 'approve', 'decline', 'approve-yes', 'decline-yes', 'cancel']
  if (!actions.includes(action as ButtonAction) || !/^[0-9a-f-]{36}$/i.test(orderId ?? '')) return null
  return {
    action: action as ButtonAction,
    orderId,
    messageId: /^\d{5,25}$/.test(messageId ?? '') ? messageId : undefined,
  }
}

/** The confirm question shown only to the person who pressed Approve or Decline. */
export function confirmPrompt(o: StoredCakeOrder, action: 'approve' | 'decline', messageId: string) {
  const amount = money(o.deposit ?? o.price)
  const content =
    action === 'decline'
      ? `Decline ${orderRef(o)} for ${o.name}? The card hold is released and ${o.name} gets the "can't make it" email.`
      : o.status === 'hold_expired'
        ? `The card hold ended. Approve ${orderRef(o)} and email ${o.name} a pay link for ${amount}?`
        : `Charge ${o.name} ${amount} for ${orderRef(o)}? They get the confirmation email.`
  return {
    content: (o.test ? '[TEST — no card is charged] ' : '') + content,
    components: [
      {
        type: 1 as const,
        components: [
          action === 'decline'
            ? button(4, 'Yes, decline', '❌', `decline-yes:${o.id}:${messageId}`)
            : button(
                3,
                o.status === 'hold_expired' ? 'Yes, send pay link' : 'Yes, charge',
                '✅',
                `approve-yes:${o.id}:${messageId}`,
              ),
          button(2, 'Cancel', '↩️', 'cancel:' + o.id),
        ],
      },
    ],
  }
}

const STATUS_LOOK: Partial<Record<StoredCakeOrder['status'], { emoji: string; color: number }>> = {
  awaiting_approval: { emoji: '⏳', color: DISCORD_COLORS.approval },
  checking_kitchen: { emoji: '👩‍🍳', color: DISCORD_COLORS.approval },
  hold_expired: { emoji: '⌛', color: DISCORD_COLORS.approval },
  paid: { emoji: '✅', color: DISCORD_COLORS.paid },
  deposit_paid: { emoji: '✅', color: DISCORD_COLORS.paid },
  awaiting_payment: { emoji: '📨', color: DISCORD_COLORS.inquiry },
  picked_up: { emoji: '🎉', color: DISCORD_COLORS.reminder },
}

/**
 * The order message after a button was used: same details with the new status, and a running list of who did what
 * ("👍 Acknowledged by Keith", "✅ Approved by Keith · charged $45") under the title.
 */
export function updatedOrderMessage(o: StoredCakeOrder, notes: string[], acknowledged: boolean) {
  const look = STATUS_LOOK[o.status] ?? { emoji: '⛔', color: DISCORD_COLORS.reminder }
  const title = `${o.test ? '[TEST] ' : ''}${look.emoji} ${cakeOrderStatusLabels[o.status] ?? o.status} · ${orderRef(o)}`
  return {
    embeds: [
      {
        title: cut(title, 256),
        url: absolute(`/admin/orders/${o.id}`),
        description: notes.length ? cut(notes.join('\n'), 4000) : undefined,
        color: look.color,
        fields: orderFields(o),
      } satisfies DiscordEmbed,
    ],
    components: orderButtons(o, acknowledged),
  }
}

export function inquiryDiscord(i: StoredCakeInquiry): DiscordMessage {
  const test = i.test ? '[TEST] ' : ''
  const title = `${test}💬 Custom cake inquiry · ${inquiryRef(i.id)}`
  const when = i.eventDate
    ? `${formatPickupDate(i.eventDate)}${i.eventTime ? ' · ' + formatPickupTime(i.eventTime) : ''}`
    : 'Not set'
  const flavor = [i.customFlavor || i.flavor, i.customFilling || i.filling].filter(Boolean).join(' / ')
  return {
    content: cut(`**${title}** — ${i.name}`, 1900),
    embed: {
      title: cut(title, 256),
      url: absolute(`/admin/inquiries/${i.id}`),
      color: DISCORD_COLORS.inquiry,
      fields: [
        ...field('👤 Customer', i.name, true),
        ...field('📞 Phone', i.phone, true),
        ...field('📧 Email', i.email, true),
        ...field('🎉 Event', `${i.eventType} · ${i.servings} servings`, true),
        ...field('📅 Date', when, true),
        ...field('🎂 Cake', `${i.size} · ${flavor}`),
        ...field('✍️ Writing on cake', i.cakeMessage),
        ...field('📷 Photos', i.photoCount ? String(i.photoCount) : '', true),
      ],
    },
  }
}

/** Fallback for notifications without their own card (admin test button, reminders). */
export function plainDiscord(title: string, body: string, url: string, color: number = DISCORD_COLORS.reminder) {
  return {
    content: cut(`**${title}**`, 1900),
    embed: { title: cut(title, 256), url: absolute(url), description: cut(body, 4000), color },
  } satisfies DiscordMessage
}
