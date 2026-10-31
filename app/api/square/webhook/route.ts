import { NextRequest, NextResponse } from 'next/server'
import { isValidWebhook } from '@/lib/square'
import { findCakeOrderByPayment } from '@/lib/cake-orders-store'
import { holdEnded } from '@/lib/cake-order-actions'

export const runtime = 'nodejs'

// Square calls this when a payment changes (subscribe to payment.updated). When a held cake order was not
// approved in time, Square releases the hold (status CANCELED): same-day and next-day orders are cancelled and the
// customer told; later orders wait as "Card hold ended".
export async function POST(request: NextRequest) {
  const raw = await request.text()
  if (raw.length > 65536 || !isValidWebhook(raw, request.headers.get('x-square-hmacsha256-signature')))
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  try {
    const event = JSON.parse(raw)
    const payment = event?.data?.object?.payment
    if (event?.type === 'payment.updated' && payment?.status === 'CANCELED' && typeof payment.id === 'string') {
      const order = await findCakeOrderByPayment(payment.id)
      if (order) await holdEnded(order)
    }
  } catch {
    return NextResponse.json({ error: 'Retry later' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
