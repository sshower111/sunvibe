import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { pickupRole } from '@/lib/staff-auth'
import { getCakeOrder, listOrderEvents, moveCakeOrder } from '@/lib/cake-orders-store'
import { isDelivery, type StoredCakeOrder } from '@/lib/cake-order'
import { refreshOrderCardQuietly } from '@/lib/discord-orders'

// The pickup screen (/pickup/<id>): one order, opened by scanning the customer's pickup QR code. Staff phones
// (lib/staff-auth.ts) and admins can read that order and confirm its pickup or delivery; nothing else.

const schema = z.object({ action: z.enum(['get', 'confirm']), id: z.string().uuid() })
const noStore = { headers: { 'Cache-Control': 'no-store' } }

/** Only what the counter needs (no email, payment or history details). */
const forCounter = (o: StoredCakeOrder) => ({
  id: o.id,
  orderNo: o.orderNo,
  name: o.name,
  phone: o.phone,
  size: o.size,
  flavor: o.flavor,
  filling: o.filling,
  cakeMessage: o.cakeMessage,
  notes: o.notes,
  pickupDate: o.pickupDate,
  pickupTime: o.pickupTime,
  fulfillment: o.fulfillment,
  deliveryAddress: o.deliveryAddress,
  price: o.price,
  deposit: o.deposit,
  status: o.status,
  test: o.test,
})

export async function POST(request: NextRequest) {
  const role = pickupRole(request)
  if (!role) return NextResponse.json({ error: 'Signed out' }, { status: 401 })
  let body
  try {
    body = schema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  try {
    const order = await getCakeOrder(body.id)
    if (!order) return NextResponse.json({ error: '找不到這張訂單。' }, { status: 404 })
    if (body.action === 'confirm') {
      const action = isDelivery(order) ? 'delivered' : 'picked_up'
      if (
        !(await moveCakeOrder(order.id, 'paid', 'picked_up', action)) &&
        !(await moveCakeOrder(order.id, 'deposit_paid', 'picked_up', action))
      )
        return NextResponse.json({ error: '這張訂單已更改，請刷新。' }, { status: 409 })
      await refreshOrderCardQuietly(
        order.id,
        `${action === 'delivered' ? '🚚 Delivered' : '🎉 Picked up'} (QR code scanned${role === 'staff' ? ' by staff' : ''})`,
      )
    }
    const [fresh, events] = await Promise.all([getCakeOrder(order.id), listOrderEvents(order.id)])
    const done = events.findLast(e => e.action === 'picked_up' || e.action === 'delivered')
    return NextResponse.json(
      { role, order: forCounter(fresh ?? order), doneAt: done ? { at: done.at, action: done.action } : null },
      noStore,
    )
  } catch {
    return NextResponse.json({ error: '網絡有問題，請重試。' }, { status: 503 })
  }
}
