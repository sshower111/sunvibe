import 'server-only'
import { randomUUID } from 'node:crypto'
import { finishCakeOrder, getCakeOrder, listCakeOrders, moveCakeOrder, startCakeOrder } from './cake-orders-store'
import { sendApprovedEmail, sendNewOrderEmails, sendNotAcceptedEmail } from './cake-order-email'
import {
  cancelPayment,
  completePayment,
  createPayment,
  getPayment,
  squareClientConfig,
  squareEnvironment,
  SquareError,
} from './square'
import { cakePrice, decideOrder, orderRef, type StoredCakeOrder } from './cake-order'
import { addDays, storeDate } from './occasion-dates'
import { SITE } from './site-info'

// Approving, declining and expiring held orders. Used by admin and by the Square webhook.
// Test orders made in production have a made-up payment ID (no card was used), so Square is skipped for them.

export const FAKE_PAYMENT_PREFIX = 'test-'
const viaSquare = (order: StoredCakeOrder) => !!order.paymentId && !order.paymentId.startsWith(FAKE_PAYMENT_PREFIX)

/** A hold Square released (approval time passed): record it and tell the customer once. */
export async function markExpired(order: StoredCakeOrder) {
  if (await moveCakeOrder(order.id, 'awaiting_approval', 'expired')) await sendNotAcceptedEmail(order)
}

/** Lists orders, first settling any held order whose approval time has passed. */
export async function listCakeOrdersSettled() {
  const orders = await listCakeOrders()
  const now = Date.now()
  for (const order of orders) {
    if (order.status !== 'awaiting_approval' || !order.approveBy || Date.parse(order.approveBy) > now) continue
    try {
      const payment = viaSquare(order) ? await getPayment(order.paymentId!) : null
      if (payment?.status === 'APPROVED') await cancelPayment(payment.id)
      if (payment?.status === 'COMPLETED') {
        await moveCakeOrder(order.id, 'awaiting_approval', 'paid')
        order.status = 'paid'
        continue
      }
      await markExpired(order)
      order.status = 'expired'
    } catch {
      // Square unreachable: leave it as is; the next refresh (or Square's webhook) settles it.
    }
  }
  return orders
}

export async function approveOrder(id: string) {
  const order = await getCakeOrder(id)
  if (!order || order.status !== 'awaiting_approval' || !order.paymentId)
    throw new Error('This order is no longer waiting for approval. Refresh the list.')
  try {
    if (viaSquare(order)) await completePayment(order.paymentId)
  } catch (error) {
    if (error instanceof SquareError && error.status === 400) {
      const payment = await getPayment(order.paymentId).catch(() => null)
      if (payment?.status === 'CANCELED') {
        await markExpired(order)
        throw new Error('Too late: the card hold already ended, so this order was cancelled and the customer told.')
      }
    }
    throw new Error('Square could not charge the card. Please retry.')
  }
  if (await moveCakeOrder(id, 'awaiting_approval', 'paid')) await sendApprovedEmail(order)
}

export async function declineOrder(id: string) {
  const order = await getCakeOrder(id)
  if (!order || order.status !== 'awaiting_approval' || !order.paymentId)
    throw new Error('This order is no longer waiting for approval. Refresh the list.')
  try {
    if (viaSquare(order)) await cancelPayment(order.paymentId)
  } catch {
    const payment = await getPayment(order.paymentId).catch(() => null)
    if (payment?.status !== 'CANCELED') throw new Error('Square could not release the card hold. Please retry.')
  }
  if (await moveCakeOrder(id, 'awaiting_approval', 'declined')) await sendNotAcceptedEmail(order)
}

/**
 * Admin "Test order": a sample order that goes through the same saving, emails, approval and Mom text as a real one.
 * - paid: 8" round 3 days ahead, charged straight away.
 * - approval: 10" round tomorrow, card only held, so Approve & charge / Decline can be tried.
 * In Square sandbox it uses Square's test card, so the payment shows in the sandbox dashboard. In production no card
 * is used at all (made-up payment ID), so nothing is ever charged. Emails go to the bakery inbox with [TEST] subjects.
 */
export async function createTestOrder(scenario: 'paid' | 'approval', now = new Date()) {
  const today = storeDate(now)
  const size = scenario === 'paid' ? '8-inch' : '10-inch'
  const pickupDate = addDays(today, scenario === 'paid' ? 3 : 1)
  const decision = decideOrder(size, pickupDate, '12:00', now)
  if (!decision.ok) throw new Error(decision.error)
  const held = decision.needsApproval
  const id = randomUUID()
  let order: StoredCakeOrder = {
    id,
    createdAt: now.toISOString(),
    name: 'Test Customer',
    email: 'test@example.com',
    phone: SITE.phone,
    size,
    flavor: 'Vanilla',
    filling: 'Strawberry Banana',
    cakeMessage: 'Happy Birthday',
    pickupDate,
    pickupTime: '12:00',
    notes: 'Test order from admin.',
    price: cakePrice(size, 'Strawberry Banana')!,
    status: 'processing',
    test: true,
    ...(held ? { approveBy: decision.approveBy.toISOString(), approvalReason: decision.reason } : {}),
  }
  order = { ...order, orderNo: (await startCakeOrder(order)) ?? undefined }
  let paymentId = FAKE_PAYMENT_PREFIX + id
  if (squareClientConfig() && squareEnvironment() === 'sandbox') {
    try {
      const payment = await createPayment({
        sourceId: 'cnon:card-nonce-ok', // Square's sandbox test card
        idempotencyKey: id,
        amountCents: Math.round(order.price * 100),
        autocomplete: !held,
        holdMinutes: held ? Math.max(1, Math.ceil((decision.approveBy.getTime() - now.getTime()) / 60_000)) : undefined,
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
  const status = held ? 'awaiting_approval' : 'paid'
  await finishCakeOrder(id, { status, paymentId, approveBy: order.approveBy })
  await sendNewOrderEmails({ ...order, status, paymentId })
  return { ref: orderRef(order), held, viaSquare: !paymentId.startsWith(FAKE_PAYMENT_PREFIX) }
}
