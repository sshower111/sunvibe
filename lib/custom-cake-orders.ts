import 'server-only'
import { randomUUID, createHash } from 'node:crypto'
import {
  amountDueNow,
  orderRef,
  PAY_LINK_DAYS,
  sizeLabel,
  type CustomOrderInput,
  type StoredCakeOrder,
} from './cake-order'
import {
  createCustomOrder,
  getCakeOrder,
  moveCakeOrder,
  saveCakeOrderDetails,
  finishCakeOrder,
} from './cake-orders-store'
import { getCakeInquiry, updateCakeInquiry } from './cake-inquiries-store'
import { sendCustomPaidEmails, sendPaymentRequestEmail } from './cake-order-email'
import { createPayment, squareEnvironment } from './square'

// Custom cake orders: a confirmed custom cake inquiry becomes a cake order with a pay link (/pay/<order id>).
// The customer pays the full price or a deposit; the order then shows in admin → Cake orders like any other.

const payByFrom = (now: Date) => new Date(now.getTime() + PAY_LINK_DAYS * 86_400_000).toISOString()

/** Pay link is usable: waiting for payment and not past its time. */
export const canPay = (o: StoredCakeOrder | null, now = new Date()): o is StoredCakeOrder =>
  !!o && o.kind === 'custom' && o.status === 'awaiting_payment' && !!o.payBy && Date.parse(o.payBy) > now.getTime()

export async function createOrderFromInquiry(input: CustomOrderInput, now = new Date()) {
  const inquiry = await getCakeInquiry(input.inquiryId)
  if (!inquiry) throw new Error('Inquiry not found.')
  const { inquiryId, deposit, deliveryAddress, ...cake } = input
  const order: StoredCakeOrder = {
    ...cake,
    id: randomUUID(),
    createdAt: now.toISOString(),
    name: inquiry.name,
    email: inquiry.email,
    phone: inquiry.phone,
    status: 'awaiting_payment',
    kind: 'custom',
    inquiryId,
    deliveryAddress: input.fulfillment === 'Pickup' ? '' : deliveryAddress,
    ...(deposit ? { deposit } : {}),
    payBy: payByFrom(now),
    ...(inquiry.test ? { test: true } : {}),
  }
  const orderNo = await createCustomOrder(order)
  const saved = { ...order, orderNo }
  await updateCakeInquiry(inquiryId, { status: 'waiting_customer' })
  const emailed = await sendPaymentRequestEmail(saved)
  return { ref: orderRef(saved), emailed, sentTo: saved.test ? 'the bakery inbox (test)' : saved.email }
}

/** Sends the pay link again with a fresh 3 days (also reopens a link that ran out). */
export async function resendPayLink(id: string, now = new Date()) {
  const order = await getCakeOrder(id)
  if (!order || order.kind !== 'custom') throw new Error('Only custom cake orders have a pay link.')
  if (order.status === 'expired' && !(await moveCakeOrder(id, 'expired', 'awaiting_payment')))
    throw new Error('This order changed. Refresh the list.')
  else if (order.status !== 'expired' && order.status !== 'awaiting_payment')
    throw new Error('This order is already paid or closed.')
  const updated = { ...order, status: 'awaiting_payment' as const, payBy: payByFrom(now) }
  await saveCakeOrderDetails(updated)
  return sendPaymentRequestEmail(updated)
}

/** Marks pay links that ran out as expired (no email; resend from admin if still wanted). */
export async function expirePayLinks(orders: StoredCakeOrder[], now = new Date()) {
  for (const o of orders)
    if (o.kind === 'custom' && o.status === 'awaiting_payment' && o.payBy && Date.parse(o.payBy) <= now.getTime())
      if (await moveCakeOrder(o.id, 'awaiting_payment', 'expired')) o.status = 'expired'
}

/** Customer pays through the link. Locks the order while charging so it can't be paid twice. */
/** Test orders on the live site are paid without a card (nothing is charged), like admin test orders. */
export const payWithoutCard = (o: StoredCakeOrder) => !!o.test && squareEnvironment() === 'production'

export async function payCustomOrder(id: string, cardToken: string | undefined, now = new Date()) {
  const order = await getCakeOrder(id)
  if (!canPay(order, now)) throw new PayError('This payment link is no longer active. Please contact the bakery.')
  if (!payWithoutCard(order) && !cardToken) throw new PayError('Please enter your card details.')
  if (!(await moveCakeOrder(id, 'awaiting_payment', 'processing')))
    throw new PayError('This order is already being paid. Refresh the page.')
  let payment: { id: string; receipt_url?: string }
  try {
    payment = payWithoutCard(order)
      ? { id: 'test-' + id }
      : await createPayment({
          sourceId: cardToken!,
          idempotencyKey: createHash('sha256')
            .update(id + ':' + cardToken)
            .digest('base64url'),
          amountCents: Math.round(amountDueNow(order) * 100),
          autocomplete: true,
          referenceId: orderRef(order),
          note: `Custom cake ${orderRef(order)}${order.deposit ? ' (deposit)' : ''}: ${sizeLabel(order.size)}, ${order.pickupDate} ${order.pickupTime}`,
          email: order.email,
        })
  } catch (error) {
    await moveCakeOrder(id, 'processing', 'awaiting_payment')
    throw error
  }
  const status = order.deposit ? 'deposit_paid' : 'paid'
  await finishCakeOrder(id, { status, paymentId: payment.id })
  const paid = { ...order, status, paymentId: payment.id } as const
  if (order.inquiryId) await updateCakeInquiry(order.inquiryId, { status: 'confirmed_paid' }).catch(() => {})
  await sendCustomPaidEmails(paid)
  return { ref: orderRef(paid), receiptUrl: payment.receipt_url }
}

export class PayError extends Error {}
