import 'server-only'
import { randomUUID } from 'node:crypto'
import {
  finishCakeOrder,
  getCakeOrder,
  listCakeOrders,
  markKitchenAsked,
  moveCakeOrder,
  saveCakeOrderDetails,
  startCakeOrder,
} from './cake-orders-store'
import {
  sendApprovedEmail,
  sendNewOrderEmails,
  sendNotAcceptedEmail,
  sendPaymentRequestEmail,
} from './cake-order-email'
import {
  cancelPayment,
  completePayment,
  createPayment,
  getPayment,
  squareClientConfig,
  squareEnvironment,
} from './square'
import {
  askKitchenDeadline,
  cakePrice,
  decideOrder,
  orderRef,
  PAY_LINK_DAYS,
  vegasInstant,
  type CakeOrderStatus,
  type StoredCakeOrder,
} from './cake-order'
import { addDays, storeDate } from './occasion-dates'
import { SITE } from './site-info'
import { expirePayLinks } from './custom-cake-orders'
import { notifyAdmins } from './push'
import { newOrderPush } from './push-messages'

// Approving, declining, asking the kitchen and ending held orders. Used by admin, the reminder job and the Square
// webhook. Every step is safe to repeat (a second tap, or a tap racing the webhook): the status only moves once,
// so the customer is charged and emailed once. Test orders made in production have a made-up payment ID (no card
// was used), so Square is skipped for them.

export const FAKE_PAYMENT_PREFIX = 'test-'
const viaSquare = (order: StoredCakeOrder) => !!order.paymentId && !order.paymentId.startsWith(FAKE_PAYMENT_PREFIX)
/** Card held, waiting on the bakery's answer. */
const WAITING: readonly CakeOrderStatus[] = ['awaiting_approval', 'checking_kitchen']
export const isWaiting = (o: Pick<StoredCakeOrder, 'status'>) => WAITING.includes(o.status)
/** Orders placed before Oct 31, 2026 have no shortHold; they were all same-day or next-day. */
const isShortHold = (o: StoredCakeOrder) => o.shortHold !== false

/**
 * The answer time passed or Square released the hold. Same-day and next-day orders are cancelled and the customer
 * told once; later orders wait as "Card hold ended", and approving them sends a pay link.
 */
export async function holdEnded(order: StoredCakeOrder): Promise<CakeOrderStatus> {
  if (!isWaiting(order)) return order.status
  const to = isShortHold(order) ? 'expired' : 'hold_expired'
  // Already settled (e.g. by Square's webhook at the same moment): report where it ended up.
  if (!(await moveCakeOrder(order.id, order.status, to))) return (await getCakeOrder(order.id))?.status ?? order.status
  order.status = to
  if (to === 'expired') await sendNotAcceptedEmail(order)
  return to
}

/** Settles one order whose answer time passed: charged elsewhere → paid, otherwise the hold is released. */
async function settle(order: StoredCakeOrder) {
  const payment = viaSquare(order) ? await getPayment(order.paymentId!) : null
  if (payment?.status === 'COMPLETED') {
    if (await moveCakeOrder(order.id, order.status, 'paid')) order.status = 'paid'
    return
  }
  if (payment?.status === 'APPROVED') await cancelPayment(payment.id)
  await holdEnded(order)
}

/** Lists orders, first settling any held order whose answer time has passed. */
export async function listCakeOrdersSettled() {
  const orders = await listCakeOrders()
  await expirePayLinks(orders)
  const now = Date.now()
  for (const order of orders) {
    if (!isWaiting(order) || !order.approveBy || Date.parse(order.approveBy) > now) continue
    try {
      await settle(order)
    } catch {
      // Square unreachable: leave it as is; the next refresh (or Square's webhook) settles it.
    }
  }
  return orders
}

export type ApproveResult = { status: 'paid' } | { status: 'awaiting_payment'; emailed: boolean }

/** The card hold ended before approval: the order waits for payment and the customer is emailed a pay link. */
async function sendPayLinkAfterHold(order: StoredCakeOrder, now: Date): Promise<ApproveResult> {
  const pickup = vegasInstant(order.pickupDate, order.pickupTime).getTime()
  const payBy = new Date(Math.min(now.getTime() + PAY_LINK_DAYS * 86_400_000, pickup)).toISOString()
  if (!(await moveCakeOrder(order.id, 'hold_expired', 'awaiting_payment', 'pay_link_sent'))) {
    const current = await getCakeOrder(order.id)
    if (current?.status === 'awaiting_payment') return { status: 'awaiting_payment', emailed: true }
    throw new Error('This order changed. Refresh the page.')
  }
  const updated = { ...order, status: 'awaiting_payment' as const, payBy }
  await saveCakeOrderDetails(updated)
  return { status: 'awaiting_payment', emailed: await sendPaymentRequestEmail(updated) }
}

/** Approve & charge. After the card hold has ended (later orders only), emails a pay link instead. */
export async function approveOrder(id: string, now = new Date()): Promise<ApproveResult> {
  const order = await getCakeOrder(id)
  if (!order) throw new Error('Order not found. Refresh the list.')
  if (order.status === 'paid') return { status: 'paid' } // second tap
  if (order.status === 'hold_expired') return sendPayLinkAfterHold(order, now)
  if (!isWaiting(order) || !order.paymentId)
    throw new Error('This order is no longer waiting for approval. Refresh the list.')
  if (isShortHold(order) && order.approveBy && Date.parse(order.approveBy) <= now.getTime()) {
    await settle(order).catch(() => {})
    throw new Error('Too late: the answer time has passed, so this order was cancelled and the customer told.')
  }
  try {
    if (viaSquare(order)) await completePayment(order.paymentId)
  } catch {
    const payment = await getPayment(order.paymentId).catch(() => null)
    if (payment?.status === 'CANCELED') {
      if ((await holdEnded(order)) === 'hold_expired') return sendPayLinkAfterHold(order, now)
      throw new Error('Too late: the card hold already ended, so this order was cancelled and the customer told.')
    }
    if (payment?.status !== 'COMPLETED') throw new Error('Square could not charge the card. Please retry.')
  }
  for (const from of WAITING)
    if (await moveCakeOrder(id, from, 'paid', 'approved')) {
      await sendApprovedEmail(order)
      break
    }
  return { status: 'paid' }
}

/** Decline: releases the card hold. The customer is emailed only when `notify` is on. */
export async function declineOrder(id: string, notify = true) {
  const order = await getCakeOrder(id)
  if (!order) throw new Error('Order not found. Refresh the list.')
  if (order.status === 'declined') return // second tap
  if (!isWaiting(order) && order.status !== 'hold_expired')
    throw new Error('This order is no longer waiting for approval. Refresh the list.')
  if (isWaiting(order) && order.paymentId && viaSquare(order)) {
    try {
      await cancelPayment(order.paymentId)
    } catch {
      const payment = await getPayment(order.paymentId).catch(() => null)
      if (payment?.status !== 'CANCELED') throw new Error('Square could not release the card hold. Please retry.')
    }
  }
  if (await moveCakeOrder(id, order.status, 'declined', notify ? 'declined' : 'declined_no_email'))
    if (notify) await sendNotAcceptedEmail(order)
}

/** Ask Kitchen: the order waits as "Checking with kitchen"; same-day and next-day orders get an extra hour if pickup allows. */
export async function askKitchen(id: string, now = new Date()) {
  const order = await getCakeOrder(id)
  if (!order) throw new Error('Order not found. Refresh the list.')
  if (order.status === 'checking_kitchen') return order // second tap
  if (order.status !== 'awaiting_approval')
    throw new Error('This order is no longer waiting for approval. Refresh the list.')
  if (order.approveBy && Date.parse(order.approveBy) <= now.getTime())
    throw new Error('Too late: the answer time has passed. Refresh the page.')
  const approveBy = askKitchenDeadline(order, now)
  if (!(await markKitchenAsked(id, approveBy))) throw new Error('This order changed. Refresh the page.')
  return { ...order, status: 'checking_kitchen' as const, approveBy }
}

/**
 * Admin "Test order": a sample order that goes through the same saving, emails, approval and Chinese kitchen text as a real one.
 * - urgent: 10" round tomorrow at noon (answer by 8 PM tonight, or within the hour).
 * - later: 8" round 3 days ahead (card held up to 7 days).
 * In Square sandbox it uses Square's test card, so the payment shows in the sandbox dashboard. In production no card
 * is used at all (made-up payment ID), so nothing is ever charged. Emails go to the bakery inbox with [TEST] subjects.
 */
export async function createTestOrder(scenario: 'urgent' | 'later', now = new Date()) {
  const today = storeDate(now)
  const size = scenario === 'urgent' ? '10-inch' : '8-inch'
  const pickupDate = addDays(today, scenario === 'urgent' ? 1 : 3)
  const decision = decideOrder(size, pickupDate, '12:00', now)
  if (!decision.ok) throw new Error(decision.error)
  const id = randomUUID()
  let order: StoredCakeOrder = {
    id,
    createdAt: now.toISOString(),
    name: 'Test Customer',
    email: 'test@example.com',
    phone: SITE.phone,
    size,
    flavor: 'Vanilla',
    filling: 'Strawberry',
    cakeMessage: 'Happy Birthday',
    pickupDate,
    pickupTime: '12:00',
    notes: 'Test order from admin.',
    price: cakePrice(size, 'Strawberry')!,
    status: 'processing',
    test: true,
    approveBy: decision.approveBy.toISOString(),
    approvalReason: decision.reason,
    holdUntil: new Date(now.getTime() + decision.holdMinutes * 60_000).toISOString(),
    shortHold: decision.shortHold,
  }
  order = { ...order, orderNo: (await startCakeOrder(order)) ?? undefined }
  let paymentId = FAKE_PAYMENT_PREFIX + id
  if (squareClientConfig() && squareEnvironment() === 'sandbox') {
    try {
      const payment = await createPayment({
        sourceId: 'cnon:card-nonce-ok', // Square's sandbox test card
        idempotencyKey: id,
        amountCents: Math.round(order.price * 100),
        autocomplete: false,
        holdMinutes: decision.holdMinutes,
        referenceId: orderRef(order),
        note: `TEST cake order ${orderRef(order)}`,
        email: order.email,
      })
      paymentId = payment.id
    } catch (error) {
      await finishCakeOrder(id, { status: 'failed' }).catch(() => {})
      throw new Error('Square sandbox refused the test payment: ' + (error as Error).message)
    }
  }
  const status = 'awaiting_approval'
  await finishCakeOrder(id, { status, paymentId, approveBy: order.approveBy })
  await sendNewOrderEmails({ ...order, status, paymentId })
  await notifyAdmins(() => newOrderPush({ ...order, status, paymentId }))
  return { ref: orderRef(order), id, viaSquare: !paymentId.startsWith(FAKE_PAYMENT_PREFIX) }
}
