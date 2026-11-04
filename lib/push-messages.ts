import {
  formatPickupDate,
  formatPickupTime,
  LAS_VEGAS,
  vegasInstant,
  isDelivery,
  type StoredCakeOrder,
} from './cake-order'
import { isUrgent } from './admin-order-board'
import { addDays, storeDate } from './occasion-dates'
import type { StoredCakeInquiry } from './cake-inquiry'
import { DISCORD_COLORS, inquiryDiscord, orderDiscord, type DiscordMessage } from './discord-messages'

// What the admin app's notifications say. Short enough for a phone lock screen:
// title "URGENT · Needs approval", body "🎂 8" vanilla/strawberry · Sat 2 PM · Jane D".
// Each one also carries the fuller Discord message (lib/discord-messages.ts) sent to the bakery's channel.

export type PushText = { title: string; body: string; url: string; tag: string; discord?: DiscordMessage }

const SHORT_SIZES: Record<string, string> = {
  '6-inch': '6"',
  '8-inch': '8"',
  '10-inch': '10"',
  '12-inch': '12"',
  'quarter-sheet': '¼ sheet',
  'half-sheet': '½ sheet',
  'full-sheet': 'Full sheet',
}
const shortSize = (size: string) => SHORT_SIZES[size] ?? size
/** "Jane Doe" → "Jane D" */
export const shortName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/)
  const last = rest.at(-1)
  return last ? `${first} ${last[0].toUpperCase()}` : first
}
/** "Today 2 PM", "Tomorrow 9:30 AM" or "Sat 2 PM" (Las Vegas time). */
export function shortWhen(date: string, time: string, now = new Date()) {
  const [h, m] = time.split(':').map(Number)
  const clock = `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`
  const today = storeDate(now)
  const day =
    date === today
      ? 'Today'
      : date === addDays(today, 1)
        ? 'Tomorrow'
        : new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' })
  return `${day} ${clock}`
}
const prefix = (test: boolean | undefined, urgent: boolean) => (test ? 'TEST · ' : '') + (urgent ? 'URGENT · ' : '')
const cakeLine = (o: StoredCakeOrder, now: Date) =>
  `🎂 ${shortSize(o.size)} ${o.flavor.toLowerCase()}/${o.filling.toLowerCase()} · ${shortWhen(o.pickupDate, o.pickupTime, now)} · ${shortName(o.name)}`
export const orderUrl = (o: Pick<StoredCakeOrder, 'id'>) => `/admin/orders/${o.id}`

/** New online cake order: "Needs approval" (every online order is held); same-day and next-day ones are URGENT. */
export function newOrderPush(o: StoredCakeOrder, now = new Date()): PushText {
  const held = o.status === 'awaiting_approval'
  const urgent = held && isUrgent(o, now)
  const headline = held ? 'Needs approval' : 'New paid cake order'
  return {
    title: prefix(o.test, urgent) + headline,
    body: cakeLine(o, now),
    url: orderUrl(o),
    tag: 'order-' + o.id,
    discord: held
      ? orderDiscord(o, headline, '⏳', DISCORD_COLORS.approval, urgent)
      : orderDiscord(o, headline, '✅', DISCORD_COLORS.paid),
  }
}

/** Customer paid through a pay link (custom cakes, and online orders approved after their card hold ended). */
export function paidLinkPush(o: StoredCakeOrder, now = new Date()): PushText {
  const headline =
    o.status === 'deposit_paid' ? 'Deposit paid' : o.kind === 'custom' ? 'Custom cake paid' : 'Cake order paid'
  return {
    title: prefix(o.test, false) + headline,
    body: cakeLine(o, now),
    url: orderUrl(o),
    tag: 'order-' + o.id,
    discord: orderDiscord(o, headline, '💰', DISCORD_COLORS.paid),
  }
}

export function newInquiryPush(i: StoredCakeInquiry): PushText {
  const when = i.eventDate ? formatPickupDate(i.eventDate) : 'date not set'
  const details = `🎂 ${i.eventType} · ${when} · ${i.servings} servings · ${shortName(i.name)}`
  return {
    title: prefix(i.test, false) + 'Custom cake inquiry',
    body: details,
    url: `/admin/inquiries/${i.id}`,
    tag: 'inquiry-' + i.id,
    discord: inquiryDiscord(i),
  }
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const vegasHour = (now: Date) =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone: LAS_VEGAS, hour: 'numeric', hourCycle: 'h23' }).format(now))

export type Reminder = { orderId: string; kind: string; push: PushText }

const vegasAt = (date: string, time: string) => vegasInstant(date, time).getTime()

/** Pickup (or delivery) reminders for a paid order that are due now; see dueReminders. */
function pickupReminders(o: StoredCakeOrder, now: Date): Reminder[] {
  const t = now.getTime()
  const placed = Date.parse(o.createdAt)
  const pickup = vegasAt(o.pickupDate, o.pickupTime)
  const twoDays = vegasAt(addDays(o.pickupDate, -2), '09:00')
  const dayBefore = vegasAt(addDays(o.pickupDate, -1), '09:00')
  const threeHours = Math.max(pickup - 3 * HOUR, vegasAt(o.pickupDate, '08:00'))
  const what = isDelivery(o) ? 'Delivery' : 'Pickup'
  const due: Reminder[] = []
  const add = (kind: string, headline: string, emoji: string) =>
    due.push({
      orderId: o.id,
      kind,
      push: {
        title: prefix(o.test, false) + headline,
        body: cakeLine(o, now),
        url: orderUrl(o),
        tag: 'order-' + o.id,
        discord: { ...orderDiscord(o, headline, emoji, DISCORD_COLORS.pickup), components: [] },
      },
    })
  if (placed < twoDays) {
    if (t >= twoDays && t < dayBefore) add('pickup-2d', `${what} in 2 days · ${formatPickupDate(o.pickupDate)}`, '📅')
  } else if (placed < dayBefore && t >= dayBefore && t < vegasAt(o.pickupDate, '00:00'))
    add('pickup-1d', `${what} tomorrow · ${formatPickupTime(o.pickupTime)}`, '📅')
  if (placed < threeHours && t >= threeHours && t < pickup)
    add('pickup-3h', `${what} today at ${formatPickupTime(o.pickupTime)}`, '⏰')
  return due
}

/**
 * Reminder pushes due now. Each has a `kind` so it is sent only once per order (lib/push.ts claimReminder).
 * - Urgent order still waiting: halfway to its answer deadline, and 15 minutes before it is cancelled.
 * - Other held orders: 24 hours before the card hold ends.
 * - Checking with kitchen: every 3 hours after asking, between 9 AM and 8 PM Las Vegas time.
 * - Paid orders (and paid deposits), by the calendar rather than exact hours so nothing comes at odd times:
 *   ordered 2+ days ahead → 9 AM two days before; ordered later than that but before 9 AM the day before → 9 AM the
 *   day before; every order → 3 hours before pickup or delivery, but not before 8 AM (then at 8 AM). Same-day orders
 *   placed within that window get no extra reminder (the new order notification just went out).
 */
export function dueReminders(orders: StoredCakeOrder[], now = new Date()): Reminder[] {
  const due: Reminder[] = []
  const t = now.getTime()
  for (const o of orders) {
    if (o.status === 'paid' || o.status === 'deposit_paid') {
      due.push(...pickupReminders(o, now))
      continue
    }
    const waiting = o.status === 'awaiting_approval' || o.status === 'checking_kitchen'
    if (!waiting) continue
    const add = (kind: string, title: string) =>
      due.push({
        orderId: o.id,
        kind,
        push: {
          title: prefix(o.test, isUrgent(o, now)) + title,
          body: cakeLine(o, now),
          url: orderUrl(o),
          tag: 'order-' + o.id,
          discord: orderDiscord(o, title, '🔔', DISCORD_COLORS.reminder, isUrgent(o, now)),
        },
      })
    const deadline = o.approveBy ? Date.parse(o.approveBy) : NaN
    if (deadline > t) {
      // Same-day and next-day orders are cancelled at the deadline; later ones only lose the card hold.
      if (o.shortHold !== false) {
        const placed = Date.parse(o.createdAt)
        if (deadline - t <= 15 * MINUTE) add('answer-final', 'Cancels in 15 min')
        else if (t >= placed + (deadline - placed) / 2) add('answer-half', 'Still needs an answer')
      } else if (deadline - t <= 24 * HOUR) add('hold-24h', 'Card hold ends in 24 hours')
    }
    if (o.status === 'checking_kitchen' && o.kitchenAskedAt) {
      const rounds = Math.floor((t - Date.parse(o.kitchenAskedAt)) / (3 * HOUR))
      const hour = vegasHour(now)
      if (rounds >= 1 && hour >= 9 && hour < 20) add('kitchen-' + rounds, 'Still checking with kitchen')
    }
  }
  return due
}
