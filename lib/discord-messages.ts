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
export type DiscordMessage = { content: string; embed: DiscordEmbed }

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
