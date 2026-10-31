import { z } from 'zod'
import { cakeCatalog, cakeLabel, deliveryOptions } from './cake-catalog'
import { flavors, fillings, MAX_CAKE_MESSAGE } from './cake-inquiry'
import { addDays, storeDate } from './occasion-dates'
import { zhOption } from './email-zh'

// Standard menu cakes ordered and paid for online through the order flow on /order-cake.
// Lead times and approval rules come from the bakery (Oct 2026):
// - 8" round and 1/4 sheet: fine from the day before.
// - 6", 10", 12" round, 1/2 and full sheet: fine 2+ days ahead; the day before needs approval.
// - Same-day (any size): at least 3 hours' notice, from 10:00 AM, and always needs approval.
// - Next-day pickups start at 9:30 AM.

export const ORDER_SIZES = [
  '6-inch',
  '8-inch',
  '10-inch',
  '12-inch',
  'quarter-sheet',
  'half-sheet',
  'full-sheet',
] as const
export type OrderSize = (typeof ORDER_SIZES)[number]
/** Sizes the bakery can make from the day before without checking. */
const EASY_SIZES: readonly OrderSize[] = ['8-inch', 'quarter-sheet']

export const ORDER_FLAVORS = flavors.filter(f => f !== 'Please recommend')
// Each filling is priced with one column of the pricing sheet (lib/cake-catalog.ts priceGroups).
export const FILLING_PRICE_GROUP: Record<string, number> = {
  Custard: 0,
  'Mixed Fresh Fruit': 1,
  Strawberry: 1,
  Banana: 1,
  Mango: 2,
  Taro: 2,
  Coconut: 3,
  Durian: 3,
}
export const ORDER_FILLINGS = fillings.filter(f => f in FILLING_PRICE_GROUP)

export const LAS_VEGAS = 'America/Los_Angeles'
export const SAME_DAY_NOTICE_HOURS = 3
export const MAX_DAYS_AHEAD = 60
const SLOT_MINUTES = 30
const SAME_DAY_FIRST = '10:00'
const NEXT_DAY_FIRST = '09:30'
/** Last pickup slot: 30 minutes before closing (8 PM, Wednesday 3 PM; lib/site-info.ts). */
const lastSlot = (date: string) => (new Date(date + 'T12:00:00Z').getUTCDay() === 3 ? '14:30' : '19:30')

export function cakePrice(size: string, filling: string) {
  const cake = cakeCatalog.find(c => c.value === size)
  const group = FILLING_PRICE_GROUP[filling]
  if (!cake || group === undefined || !(ORDER_SIZES as readonly string[]).includes(size)) return null
  return cake.prices[group]
}

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
const hhmm = (total: number) =>
  `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`

/** The UTC instant of a Las Vegas wall-clock date and time (handles daylight saving). */
export function vegasInstant(date: string, time: string) {
  const guess = new Date(`${date}T${time}:00Z`)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: LAS_VEGAS,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(guess)
  const get = (type: string) => Number(parts.find(p => p.type === type)!.value)
  const shown = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))
  return new Date(guess.getTime() + (guess.getTime() - shown))
}

/** Pickup times customers can choose on a date, given the current time. */
export function pickupSlots(date: string, now = new Date()) {
  const today = storeDate(now)
  if (date < today || date > addDays(today, MAX_DAYS_AHEAD)) return []
  const first = minutes(date === today ? SAME_DAY_FIRST : NEXT_DAY_FIRST)
  const notice = now.getTime() + SAME_DAY_NOTICE_HOURS * 3600_000
  const slots: string[] = []
  for (let t = first; t <= minutes(lastSlot(date)); t += SLOT_MINUTES) {
    const time = hhmm(t)
    if (vegasInstant(date, time).getTime() >= notice) slots.push(time)
  }
  return slots
}

export type OrderDecision =
  | { ok: false; error: string }
  | { ok: true; needsApproval: false }
  | { ok: true; needsApproval: true; approveBy: Date; reason: string }

/** Checks the pickup time and decides whether the order is charged now or held for approval. */
export function decideOrder(size: string, date: string, time: string, now = new Date()): OrderDecision {
  if (!(ORDER_SIZES as readonly string[]).includes(size)) return { ok: false, error: 'Choose a listed cake size.' }
  if (!pickupSlots(date, now).includes(time))
    return { ok: false, error: 'That pickup time is no longer available. Please choose another.' }
  const today = storeDate(now)
  const pickup = vegasInstant(date, time).getTime()
  const hour = 3600_000
  if (date === today)
    return { ok: true, needsApproval: true, approveBy: new Date(now.getTime() + hour), reason: 'Same-day order' }
  if (date === addDays(today, 1) && !EASY_SIZES.includes(size as OrderSize)) {
    const approveBy = Math.max(now.getTime() + hour, Math.min(now.getTime() + 12 * hour, pickup - 3 * hour))
    return { ok: true, needsApproval: true, approveBy: new Date(approveBy), reason: 'Next-day order for this size' }
  }
  return { ok: true, needsApproval: false }
}

const phone = z
  .string()
  .trim()
  .min(7, 'Enter a phone number.')
  .max(30)
  .regex(/^[+\d\s().-]+$/, 'Enter a valid phone number.')
  .refine(v => {
    const n = v.replace(/\D/g, '').length
    return n >= 7 && n <= 11
  }, 'Enter a valid phone number.')

export const cakeOrderSchema = z.object({
  requestId: z.string().uuid(),
  name: z.string().trim().min(1, 'Enter your name.').max(100),
  email: z.string().trim().email('Enter a valid email address.').max(100),
  phone,
  size: z.enum(ORDER_SIZES, { errorMap: () => ({ message: 'Choose a cake size.' }) }),
  flavor: z.enum(ORDER_FLAVORS as [string, ...string[]], { errorMap: () => ({ message: 'Choose a flavor.' }) }),
  filling: z.enum(ORDER_FILLINGS as [string, ...string[]], { errorMap: () => ({ message: 'Choose a filling.' }) }),
  cakeMessage: z
    .string()
    .trim()
    .max(MAX_CAKE_MESSAGE, `Please keep the writing under ${MAX_CAKE_MESSAGE} characters.`)
    .default(''),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a pickup date.'),
  pickupTime: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a pickup time.'),
  notes: z.string().trim().max(500, 'Please keep notes under 500 characters.').default(''),
})
export type CakeOrderInput = z.infer<typeof cakeOrderSchema>

export const cakeOrderStatuses = [
  'processing',
  'awaiting_approval',
  'paid',
  'picked_up',
  'declined',
  'expired',
  'failed',
  'awaiting_payment',
  'deposit_paid',
] as const
export type CakeOrderStatus = (typeof cakeOrderStatuses)[number]
export const cakeOrderStatusLabels: Record<CakeOrderStatus, string> = {
  processing: 'Payment in progress',
  awaiting_approval: 'Needs approval',
  paid: 'Paid',
  picked_up: 'Picked up',
  declined: 'Declined',
  expired: 'Not approved in time',
  failed: 'Payment failed',
  awaiting_payment: 'Awaiting payment',
  deposit_paid: 'Deposit paid',
}

export type StoredCakeOrder = Omit<CakeOrderInput, 'requestId' | 'size'> & {
  /** A listed size value (e.g. '8-inch'); custom orders may use any catalog size or a typed description. */
  size: string
  id: string
  createdAt: string
  price: number
  status: CakeOrderStatus
  paymentId?: string
  /** Set when the card is only held: approve before this time or the hold is released. */
  approveBy?: string
  approvalReason?: string
  /** Made with admin "Test order": emails go to the bakery inbox only and no real card is charged. */
  test?: boolean
  /** Sequential order number (#1001, ...), assigned by the database when the order is saved. */
  orderNo?: number
  /** 'custom' = made in admin from a custom cake inquiry; the customer pays through a link (/pay/<id>). */
  kind?: 'custom'
  inquiryId?: string
  /** Custom orders: 'Pickup' or one of the delivery options, and the address for delivery. */
  fulfillment?: string
  deliveryAddress?: string
  /** Custom orders paid with a deposit: the amount due now (the rest is due at pickup/delivery). */
  deposit?: number
  /** Custom orders: the pay link works until this time. */
  payBy?: string
}

/** Amount the customer pays online now. */
export const amountDueNow = (o: Pick<StoredCakeOrder, 'price' | 'deposit'>) => o.deposit ?? o.price
export const isDelivery = (o: Pick<StoredCakeOrder, 'fulfillment'>) => !!o.fulfillment && o.fulfillment !== 'Pickup'
export const PAY_LINK_DAYS = 3

/** Admin form that turns a confirmed custom cake inquiry into an order with a pay link. */
export const customOrderSchema = z
  .object({
    inquiryId: z.string().uuid(),
    size: z.string().trim().min(1, 'Enter the cake size.').max(100),
    flavor: z.string().trim().min(1, 'Enter the flavor.').max(100),
    filling: z.string().trim().min(1, 'Enter the filling.').max(100),
    cakeMessage: z.string().trim().max(MAX_CAKE_MESSAGE).default(''),
    pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose the pickup or delivery date.'),
    pickupTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose the pickup or delivery time.'),
    fulfillment: z.enum(deliveryOptions),
    deliveryAddress: z.string().trim().max(500).default(''),
    notes: z.string().trim().max(1000, 'Please keep the design notes under 1,000 characters.').default(''),
    price: z.coerce.number().min(1, 'Enter the total price.').max(10000),
    deposit: z.coerce.number().min(0).max(10000).optional(),
  })
  .refine(v => v.fulfillment === 'Pickup' || v.deliveryAddress.length > 0, {
    message: 'Enter the delivery address.',
    path: ['deliveryAddress'],
  })
  .refine(v => !v.deposit || v.deposit < v.price, {
    message: 'The deposit must be less than the total.',
    path: ['deposit'],
  })
export type CustomOrderInput = z.infer<typeof customOrderSchema>

/** Order code shown to customers, in emails and in Square: #1001. Orders saved before numbering show their old 4-character code. */
export const orderRef = (o: Pick<StoredCakeOrder, 'id' | 'orderNo'>) =>
  '#' + (o.orderNo ?? o.id.slice(0, 4).toUpperCase())
export const sizeLabel = cakeLabel

export function formatPickupTime(time: string) {
  const t = minutes(time)
  return `${Math.floor(t / 60) % 12 || 12}:${time.slice(3, 5)} ${t < 720 ? 'AM' : 'PM'}`
}
export function formatPickupDate(date: string) {
  return new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
export const formatVegasTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    timeZone: LAS_VEGAS,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const ZH_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
/** Hong Kong style: 10月24日（星期六）下午3:00 */
export function zhPickup(date: string, time: string) {
  const d = new Date(date + 'T12:00:00Z')
  const t = minutes(time)
  const period = t < 720 ? '上午' : t < 1080 ? '下午' : '晚上'
  const clock = `${Math.floor(t / 60) % 12 || 12}:${time.slice(3, 5)}`
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日（星期${ZH_WEEKDAYS[d.getUTCDay()]}）${period}${clock}`
}

/** Order text copied from admin and sent to the kitchen (Traditional Chinese, Hong Kong wording). */
export function kitchenText(
  order: Pick<
    StoredCakeOrder,
    'phone' | 'size' | 'flavor' | 'filling' | 'pickupDate' | 'pickupTime' | 'cakeMessage' | 'notes'
  > &
    Partial<Pick<StoredCakeOrder, 'fulfillment' | 'deliveryAddress'>>,
) {
  return [
    `電話：${order.phone}`,
    `尺寸：${zhOption(sizeLabel(order.size))}`,
    `口味：${zhOption(order.flavor)}`,
    `餡料：${zhOption(order.filling)}`,
    `${isDelivery(order) ? '送貨' : '取貨'}：${zhPickup(order.pickupDate, order.pickupTime)}`,
    `方式：${isDelivery(order) ? zhOption(order.fulfillment!) : '自取'}`,
    ...(isDelivery(order) && order.deliveryAddress ? [`地址：${order.deliveryAddress}`] : []),
    ...(order.cakeMessage ? [`蛋糕上的字：${order.cakeMessage}`] : []),
    ...(order.notes ? [`備註：${order.notes}`] : []),
  ].join('\n')
}
