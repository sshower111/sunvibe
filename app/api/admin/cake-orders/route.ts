import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdminRequest } from '@/lib/admin-auth'
import { deleteCakeOrder, getCakeOrder, listOrderEvents, markKitchenSent, moveCakeOrder } from '@/lib/cake-orders-store'
import {
  approveOrder,
  askKitchen,
  createTestOrder,
  declineOrder,
  getCakeOrderSettled,
  listCakeOrdersSettled,
  refundOrder,
} from '@/lib/cake-order-actions'
import { bakeryInbox } from '@/lib/email'
import { createCustomCakeOrder, resendPayLink } from '@/lib/custom-cake-orders'
import { customOrderSchema } from '@/lib/cake-order'
import { deleteCard, refreshOrderCardQuietly } from '@/lib/discord-orders'
import { sendThankYou } from '@/lib/thank-you'

const actionSchema = z.object({
  action: z.enum([
    'get',
    'approve',
    'decline',
    'ask_kitchen',
    'paid_offline',
    'picked_up',
    'delivered',
    'not_picked_up',
    'delete',
    'resend_link',
    'kitchen_sent',
    'refund',
    'send_thanks',
  ]),
  id: z.string().uuid(),
  /** Decline: email the customer that we can't make it. Refund: email the customer about the refund. */
  notify: z.boolean().optional(),
})

/** The kitchen's mobile number for the Send to Kitchen / Ask Kitchen texts (Vercel env KITCHEN_PHONE). */
const kitchenPhone = () => process.env.KITCHEN_PHONE?.trim() ?? ''
const noStore = { headers: { 'Cache-Control': 'no-store' } }
/** The line each admin action adds to the order's Discord card. */
const ADMIN_NOTES: Partial<Record<string, string>> = {
  decline: '❌ Declined in admin',
  refund: '↩️ Refunded in admin',
  ask_kitchen: '👩‍🍳 Checking with kitchen (admin)',
  paid_offline: '💵 Paid in store or by phone',
  resend_link: '📨 Pay link sent again',
  kitchen_sent: '📲 Texted to the kitchen',
  picked_up: '🎉 Picked up',
  delivered: '🚚 Delivered',
  not_picked_up: '↩️ Marked not picked up',
}

export async function POST(req: NextRequest) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    if (body.action === 'list')
      return NextResponse.json({ orders: await listCakeOrdersSettled(), kitchenPhone: kitchenPhone() }, noStore)
    if (body.action === 'test') {
      if (body.scenario !== 'urgent' && body.scenario !== 'later')
        return NextResponse.json({ error: 'Invalid test' }, { status: 400 })
      if (!process.env.RESEND_API_KEY)
        return NextResponse.json({ error: 'Email is not set up (RESEND_API_KEY).' }, { status: 503 })
      return NextResponse.json({ ...(await createTestOrder(body.scenario)), sentTo: bakeryInbox() })
    }
    if (body.action === 'create_custom') {
      // Cake orders → New custom order: a custom cake made from scratch (e.g. ordered by phone), with a pay link.
      if (!process.env.RESEND_API_KEY)
        return NextResponse.json({ error: 'Email is not set up (RESEND_API_KEY).' }, { status: 503 })
      const order = customOrderSchema.safeParse(body.order)
      if (!order.success) return NextResponse.json({ error: order.error.issues[0].message }, { status: 400 })
      if (order.data.inquiryId)
        return NextResponse.json({ error: 'Use Approve & send pay link on the inquiry.' }, { status: 400 })
      return NextResponse.json(await createCustomCakeOrder(order.data))
    }
    const parsed = actionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    const { action, id } = parsed.data
    if (action === 'get') {
      const order = await getCakeOrderSettled(id)
      if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
      return NextResponse.json({ order, events: await listOrderEvents(id), kitchenPhone: kitchenPhone() }, noStore)
    }
    if (action === 'delete') {
      // Gone for good: the order, its history and its Discord card (with the thread under it).
      await deleteCakeOrder(id)
      return NextResponse.json({ success: true, discordDeleted: await deleteCard('order', id) })
    }
    if (action === 'send_thanks') {
      // Normally sent a day after pickup by the reminder job; this sends it now (still only once per order).
      if (!(await sendThankYou(id)))
        throw new Error('Already sent, not picked up yet, or not a custom cake (only custom cakes get it).')
      return NextResponse.json({ success: true })
    }
    if (action === 'approve') {
      const result = await approveOrder(id)
      await refreshOrderCardQuietly(
        id,
        result.status === 'paid' ? '✅ Approved in admin' : '✅ Approved in admin · pay link emailed',
      )
      return NextResponse.json({ success: true, ...result })
    }
    if (action === 'decline') await declineOrder(id, parsed.data.notify ?? true)
    else if (action === 'refund') await refundOrder(id, parsed.data.notify ?? true)
    else if (action === 'ask_kitchen') await askKitchen(id)
    else if (action === 'kitchen_sent') {
      if (!(await markKitchenSent(id))) throw new Error('Order not found. Refresh the list.')
    } else if (action === 'paid_offline') {
      // Not approved in time, declined or pay link expired, but the customer paid another way (phone, in store).
      if (
        !(await moveCakeOrder(id, 'expired', 'paid', 'paid_offline')) &&
        !(await moveCakeOrder(id, 'declined', 'paid', 'paid_offline')) &&
        !(await moveCakeOrder(id, 'hold_expired', 'paid', 'paid_offline'))
      )
        throw new Error('This order changed. Refresh the list.')
    } else if (action === 'resend_link') {
      if (!(await resendPayLink(id))) throw new Error('The email could not be sent. Please retry.')
    } else if (action === 'picked_up' || action === 'delivered') {
      // Deposit orders: the balance is taken at pickup, so they can be marked picked up too.
      // Delivered orders have the same status (Picked up); their history says Delivered.
      if (
        !(await moveCakeOrder(id, 'paid', 'picked_up', action)) &&
        !(await moveCakeOrder(id, 'deposit_paid', 'picked_up', action))
      )
        throw new Error('This order changed. Refresh the list.')
    } else {
      const order = await getCakeOrder(id)
      if (!(await moveCakeOrder(id, 'picked_up', order?.deposit ? 'deposit_paid' : 'paid', 'not_picked_up')))
        throw new Error('This order changed. Refresh the list.')
    }
    // Discord: the order's card shows the new status and what was done.
    await refreshOrderCardQuietly(id, ADMIN_NOTES[action])
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'Cake orders unavailable. Please retry.'
    return NextResponse.json({ error: message }, { status: 409 })
  }
}
