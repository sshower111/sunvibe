import type { StoredCakeOrder } from './cake-order'
import { addDays, storeDate } from './occasion-dates'

/** Pickup is today or tomorrow (Las Vegas time): answer quickly or the order is cancelled. Marked URGENT in admin. */
export const isUrgent = (o: Pick<StoredCakeOrder, 'pickupDate'>, now = new Date()) =>
  o.pickupDate <= addDays(storeDate(now), 1)
