import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SITE } from '@/lib/site-info'
import { cakeOrderSchema, cakePrice, decideOrder, orderRef, sizeLabel, type StoredCakeOrder } from '@/lib/cake-order'
import { finishCakeOrder, startCakeOrder } from '@/lib/cake-orders-store'
import { sendNewOrderEmails } from '@/lib/cake-order-email'
import { cardErrorMessage, createPayment, squareClientConfig, SquareError } from '@/lib/square'
import { verifyTurnstile } from '@/lib/turnstile'
import { getClientIp, rateLimiter } from '@/lib/security'

export const runtime = 'nodejs'
const fail = (error: string, status: number) => NextResponse.json({ error }, { status })
const bodySchema = cakeOrderSchema.extend({
  cardToken: z.string().min(1).max(2048),
  captchaToken: z.string().min(1).max(2048),
})

// Online cake order: check the cake and pickup time, then either charge the card now or (for orders that need
// the bakery's OK) only hold it. The order row is saved before the card is touched.
export async function POST(request: NextRequest) {
  if (!rateLimiter.check('cake-order:' + getClientIp(request), 8, 10 * 60 * 1000))
    return fail(`Too many attempts. Please wait 10 minutes or call ${SITE.phone}.`, 429)
  if (!squareClientConfig() || !process.env.RESEND_API_KEY)
    return fail(`Online cake orders are unavailable right now. Please call ${SITE.phone}.`, 503)
  let parsed
  try {
    const raw = await request.text()
    if (raw.length > 16384) return fail('Order is too large.', 413)
    parsed = bodySchema.safeParse(JSON.parse(raw))
  } catch {
    return fail('Please refresh the page and try again.', 400)
  }
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400)
  const { cardToken, captchaToken, requestId, ...input } = parsed.data
  if (!(await verifyTurnstile(captchaToken, 'cake_order'))) return fail('Please try verification again.', 403)

  const now = new Date()
  const decision = decideOrder(input.size, input.pickupDate, input.pickupTime, now)
  if (!decision.ok) return fail(decision.error, 400)
  const price = cakePrice(input.size, input.filling)
  if (price === null) return fail('Choose a listed cake and filling.', 400)
  const held = decision.needsApproval
  let order: StoredCakeOrder = {
    ...input,
    id: requestId,
    createdAt: now.toISOString(),
    price,
    status: 'processing',
    ...(held ? { approveBy: decision.approveBy.toISOString(), approvalReason: decision.reason } : {}),
  }

  try {
    const orderNo = await startCakeOrder(order)
    if (orderNo === null) return fail('This order was already placed. Check your email.', 409)
    order = { ...order, orderNo }
  } catch {
    return fail(`Your order could not be saved. Nothing was charged. Please retry or call ${SITE.phone}.`, 503)
  }

  let payment
  try {
    payment = await createPayment({
      sourceId: cardToken,
      // A new card token (e.g. after a decline) is a new attempt; resending the same one is not.
      // Square allows at most 45 characters: 43-character hash of the order ID and card token.
      idempotencyKey: createHash('sha256')
        .update(requestId + ':' + cardToken)
        .digest('base64url'),
      amountCents: Math.round(price * 100),
      autocomplete: !held,
      holdMinutes: held ? Math.max(1, Math.ceil((decision.approveBy.getTime() - now.getTime()) / 60_000)) : undefined,
      referenceId: orderRef(order),
      note: `Cake ${orderRef(order)}: ${sizeLabel(input.size)} ${input.flavor}/${input.filling}, pickup ${input.pickupDate} ${input.pickupTime}`,
      email: input.email,
    })
  } catch (error) {
    await finishCakeOrder(requestId, { status: 'failed' }).catch(() => {})
    // Shows in Vercel → Logs. No card details are ever in here (only Square's error code and message).
    const code = error instanceof SquareError ? error.code : 'UNKNOWN'
    console.error('Square payment failed', {
      ref: orderRef(order),
      code,
      status: error instanceof SquareError ? error.status : undefined,
      detail: (error as Error).message,
    })
    return fail(
      cardErrorMessage(error) || `The payment didn't go through (${code}). Please try again or call ${SITE.phone}.`,
      402,
    )
  }

  const status = held ? 'awaiting_approval' : 'paid'
  const saved = { ...order, status, paymentId: payment.id } as const
  try {
    await finishCakeOrder(requestId, { status, paymentId: payment.id, approveBy: order.approveBy })
  } catch {
    // The payment exists in Square with this order's reference; the bakery email below still goes out.
  }
  await sendNewOrderEmails(saved)
  return NextResponse.json({
    success: true,
    held,
    ref: orderRef(order),
    approveBy: order.approveBy,
    receiptUrl: payment.receipt_url,
  })
}
