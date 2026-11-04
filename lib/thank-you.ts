import 'server-only'
import type { StoredCakeOrder } from './cake-order'
import { getCakeOrder } from './cake-orders-store'
import { verifiedDatabase } from './database'
import { sendThankYouEmail } from './cake-order-email'

// The thank-you email, one day after an order is picked up or delivered: a short thanks and one "Share a photo"
// button (/photos/<order id>). Sent once per order, never a reminder, and only in the daytime (Las Vegas).

const HOUR = 3_600_000
/** Photos are accepted for 60 days after the order was picked up. */
const PHOTO_DAYS = 60

export const acceptsPhotos = (o: Pick<StoredCakeOrder, 'status' | 'pickupDate'>, now = new Date()) =>
  ['paid', 'deposit_paid', 'picked_up'].includes(o.status) &&
  now.getTime() - Date.parse(o.pickupDate + 'T00:00:00Z') < PHOTO_DAYS * 24 * HOUR

const vegasHour = (now: Date) =>
  Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hourCycle: 'h23' }).format(
      now,
    ),
  )
/** 9 AM to 7:59 PM in Las Vegas. */
export const sendingHours = (now: Date) => vegasHour(now) >= 9 && vegasHour(now) < 20

/**
 * Sends the thank-you emails that are due: orders picked up or delivered 24 to 72 hours ago (older ones are skipped,
 * so turning this on doesn't email past customers). Called by the reminder job every 15 minutes.
 */
export async function sendDueThankYous(now = new Date()) {
  if (!sendingHours(now)) return 0
  const sql = await verifiedDatabase('content')
  const due = await sql`SELECT DISTINCT e.order_id FROM bakery_cake_order_events e
    WHERE e.action IN ('picked_up','delivered')
      AND e.at <= ${new Date(now.getTime() - 24 * HOUR)} AND e.at > ${new Date(now.getTime() - 72 * HOUR)}
      AND NOT EXISTS (SELECT 1 FROM bakery_push_reminders r WHERE r.order_id=e.order_id AND r.kind='thank-you')`
  let sent = 0
  for (const { order_id } of due) if (await sendThankYou(order_id as string)) sent++
  return sent
}

/** Sends one order's thank-you email, once (also used by admin "Send thank-you email now"). */
export async function sendThankYou(orderId: string) {
  const order = await getCakeOrder(orderId)
  if (!order || order.status !== 'picked_up') return false
  const sql = await verifiedDatabase('content')
  const claimed =
    await sql`INSERT INTO bakery_push_reminders(order_id,kind) VALUES(${orderId},'thank-you') ON CONFLICT DO NOTHING RETURNING kind`
  if (!claimed.length) return false
  if (await sendThankYouEmail(order)) return true
  // Not sent: let the next run try again.
  await sql`DELETE FROM bakery_push_reminders WHERE order_id=${orderId} AND kind='thank-you'`
  return false
}
