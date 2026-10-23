import 'server-only'
import { getCakeOrder, listCakeOrders, moveCakeOrder } from './cake-orders-store'
import { sendApprovedEmail, sendNotAcceptedEmail } from './cake-order-email'
import { cancelPayment, completePayment, getPayment, SquareError } from './square'
import type { StoredCakeOrder } from './cake-order'

// Approving, declining and expiring held orders. Used by admin and by the Square webhook.

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
      const payment = order.paymentId ? await getPayment(order.paymentId) : null
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
    await completePayment(order.paymentId)
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
    await cancelPayment(order.paymentId)
  } catch {
    const payment = await getPayment(order.paymentId).catch(() => null)
    if (payment?.status !== 'CANCELED') throw new Error('Square could not release the card hold. Please retry.')
  }
  if (await moveCakeOrder(id, 'awaiting_approval', 'declined')) await sendNotAcceptedEmail(order)
}
