import type { StoredCakeOrder } from './cake-order'
import { addDays, storeDate } from './occasion-dates'

// The three lists pinned at the top of admin → Cake orders, so nothing waiting on the bakery is missed.

/** Pickup is today or tomorrow (Las Vegas time): answer quickly or the order is cancelled. */
export const isUrgent = (o: Pick<StoredCakeOrder, 'pickupDate'>, now = new Date()) =>
  o.pickupDate <= addDays(storeDate(now), 1)

const pickupKey = (o: StoredCakeOrder) => o.pickupDate + o.pickupTime
const byPickup = (a: StoredCakeOrder, b: StoredCakeOrder) => pickupKey(a).localeCompare(pickupKey(b))

export function orderBoard(orders: StoredCakeOrder[], now = new Date()) {
  const needsApproval = orders
    .filter(o => o.status === 'awaiting_approval' || o.status === 'hold_expired')
    // Urgent first; within each group, the one that must be answered (or picked up) soonest first.
    .sort((a, b) => Number(isUrgent(b, now)) - Number(isUrgent(a, now)) || byPickup(a, b))
  return {
    needsApproval,
    checkingKitchen: orders.filter(o => o.status === 'checking_kitchen').sort(byPickup),
    notSentToKitchen: orders
      .filter(o => (o.status === 'paid' || o.status === 'deposit_paid') && !o.kitchenSentAt)
      .sort(byPickup),
  }
}
