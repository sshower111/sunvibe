import 'server-only'
import { verifiedDatabase } from './database'
import { encode, decode } from './storage-crypto'
import { canDeleteOrder } from './admin-order-actions'
import { vegasInstant, type CakeOrderStatus, type StoredCakeOrder } from './cake-order'

const contentDatabase = () => verifiedDatabase('content')
type Row = {
  payload: string
  status: string
  payment_id: string | null
  approve_by: Date | string | null
  order_no: number | string | null
  kitchen_asked_at: Date | string | null
  kitchen_sent_at: Date | string | null
}
const toOrder = (r: Row): StoredCakeOrder => ({
  ...(decode(r.payload) as StoredCakeOrder),
  status: r.status as CakeOrderStatus,
  paymentId: r.payment_id ?? undefined,
  approveBy: r.approve_by ? new Date(r.approve_by).toISOString() : undefined,
  orderNo: r.order_no == null ? undefined : Number(r.order_no),
  kitchenAskedAt: r.kitchen_asked_at ? new Date(r.kitchen_asked_at).toISOString() : undefined,
  kitchenSentAt: r.kitchen_sent_at ? new Date(r.kitchen_sent_at).toISOString() : undefined,
})

export async function listCakeOrders(): Promise<StoredCakeOrder[]> {
  const sql = await contentDatabase()
  // Failed payment attempts are kept 2 days for reference (nothing was charged), then deleted.
  await sql`DELETE FROM bakery_cake_orders WHERE status='failed' AND created_at < now() - interval '2 days'`
  const rows =
    await sql`SELECT payload,status,payment_id,approve_by,order_no,kitchen_asked_at,kitchen_sent_at FROM bakery_cake_orders WHERE status <> 'failed' OR created_at > now() - interval '2 days' ORDER BY created_at DESC LIMIT 500`
  return rows.map(r => toOrder(r as unknown as Row))
}

export async function getCakeOrder(id: string) {
  const sql = await contentDatabase()
  const rows =
    await sql`SELECT payload,status,payment_id,approve_by,order_no,kitchen_asked_at,kitchen_sent_at FROM bakery_cake_orders WHERE id=${id}`
  return rows.length ? toOrder(rows[0] as unknown as Row) : null
}

export async function findCakeOrderByPayment(paymentId: string) {
  const sql = await contentDatabase()
  const rows =
    await sql`SELECT payload,status,payment_id,approve_by,order_no,kitchen_asked_at,kitchen_sent_at FROM bakery_cake_orders WHERE payment_id=${paymentId}`
  return rows.length ? toOrder(rows[0] as unknown as Row) : null
}

/**
 * Reserves the order before the card is charged, so a payment is never taken without a saved order.
 * Returns the order number (#1001, ...), or null when this request ID already has an order that isn't a
 * failed attempt. A retried failed attempt keeps its number.
 */
export async function startCakeOrder(order: StoredCakeOrder) {
  const sql = await contentDatabase()
  const pickupAt = vegasInstant(order.pickupDate, order.pickupTime).toISOString()
  // Retry of a failed attempt: reuse its row and number.
  const retried = await sql`UPDATE bakery_cake_orders
    SET payload=${encode(order)},status='processing',pickup_at=${pickupAt},updated_at=now()
    WHERE id=${order.id} AND status='failed' RETURNING order_no`
  if (retried.length) return Number(retried[0].order_no)
  // Only a new order takes a number; a resent request (conflict) doesn't use one up.
  const existing = await sql`SELECT 1 FROM bakery_cake_orders WHERE id=${order.id}`
  if (existing.length) return null
  const rows = await sql`INSERT INTO bakery_cake_orders(id,payload,status,pickup_at,created_at)
    VALUES(${order.id},${encode(order)},'processing',${pickupAt},${order.createdAt})
    ON CONFLICT(id) DO NOTHING RETURNING order_no`
  return rows.length ? Number(rows[0].order_no) : null
}

export async function finishCakeOrder(
  id: string,
  change: { status: CakeOrderStatus; paymentId?: string; approveBy?: string },
) {
  const sql = await contentDatabase()
  await sql`UPDATE bakery_cake_orders SET status=${change.status},payment_id=COALESCE(${change.paymentId ?? null},payment_id),
    approve_by=${change.approveBy ?? null},updated_at=now() WHERE id=${id}`
  const action = { failed: 'payment_failed', awaiting_approval: 'placed' }[change.status as string] ?? change.status
  await logOrderEvent(id, action, 'processing', change.status)
}

/** Records that the order details were texted to the kitchen (the latest time is kept). */
export async function markKitchenSent(id: string) {
  const sql = await contentDatabase()
  const rows =
    await sql`UPDATE bakery_cake_orders SET kitchen_sent_at=now(),updated_at=now() WHERE id=${id} RETURNING id`
  if (rows.length) await logOrderEvent(id, 'kitchen_sent')
  return rows.length > 0
}

/** Ask Kitchen: the order waits as "Checking with kitchen", with its new answer deadline. */
export async function markKitchenAsked(id: string, approveBy: string | undefined) {
  const sql = await contentDatabase()
  const rows = await sql`UPDATE bakery_cake_orders
    SET status='checking_kitchen',kitchen_asked_at=now(),approve_by=${approveBy ?? null},updated_at=now()
    WHERE id=${id} AND status='awaiting_approval' RETURNING id`
  if (rows.length) await logOrderEvent(id, 'ask_kitchen', 'awaiting_approval', 'checking_kitchen')
  return rows.length > 0
}

export type OrderEvent = { at: string; action: string; from?: string; to?: string; detail: string }

/** Adds a line to the order's history. Never fails the action itself (e.g. before db/009 has been run). */
export async function logOrderEvent(id: string, action: string, from?: string, to?: string, detail = '') {
  try {
    const sql = await contentDatabase()
    await sql`INSERT INTO bakery_cake_order_events(order_id,action,from_status,to_status,detail)
      VALUES(${id},${action},${from ?? null},${to ?? null},${detail})`
  } catch (error) {
    console.error('Order history not saved', { id, action, error: (error as Error).message })
  }
}

export async function listOrderEvents(id: string): Promise<OrderEvent[]> {
  try {
    const sql = await contentDatabase()
    const rows =
      await sql`SELECT at,action,from_status,to_status,detail FROM bakery_cake_order_events WHERE order_id=${id} ORDER BY at, id`
    return rows.map(r => ({
      at: new Date(r.at as string).toISOString(),
      action: r.action as string,
      from: (r.from_status as string | null) ?? undefined,
      to: (r.to_status as string | null) ?? undefined,
      detail: r.detail as string,
    }))
  } catch {
    return []
  }
}

/** Deletes an order and its history for good (admin "Delete order"). Nothing is refunded or emailed. */
export async function deleteCakeOrder(id: string) {
  const order = await getCakeOrder(id)
  if (!order) throw new Error('Order not found. Refresh the list.')
  if (!canDeleteOrder(order)) throw new Error("The customer's card is still on hold. Decline the order first.")
  const sql = await contentDatabase()
  await sql`DELETE FROM bakery_cake_orders WHERE id=${id}`
  await sql`DELETE FROM bakery_cake_order_events WHERE order_id=${id}`.catch(() => {})
}

/**
 * Moves an order on only if it is still in the expected status; returns whether it changed. Only one of two
 * taps (or a tap and Square's webhook) can win, so emails and charges that follow happen once. Logged in its history.
 */
export async function moveCakeOrder(id: string, from: CakeOrderStatus, to: CakeOrderStatus, action: string = to) {
  const sql = await contentDatabase()
  const rows =
    await sql`UPDATE bakery_cake_orders SET status=${to},updated_at=now() WHERE id=${id} AND status=${from} RETURNING id`
  if (rows.length) await logOrderEvent(id, action, from, to)
  return rows.length > 0
}

/** Saves a custom cake order made in admin; it waits for the customer to pay through the link. Returns its number. */
export async function createCustomOrder(order: StoredCakeOrder) {
  const sql = await contentDatabase()
  const pickupAt = vegasInstant(order.pickupDate, order.pickupTime).toISOString()
  const rows = await sql`INSERT INTO bakery_cake_orders(id,payload,status,pickup_at,created_at)
    VALUES(${order.id},${encode(order)},'awaiting_payment',${pickupAt},${order.createdAt}) RETURNING order_no`
  return Number(rows[0].order_no)
}

/** Replaces the stored details of an order (e.g. a new pay-by time when the link is sent again). */
export async function saveCakeOrderDetails(order: StoredCakeOrder) {
  const sql = await contentDatabase()
  const {
    status: _status,
    paymentId: _paymentId,
    approveBy: _approveBy,
    orderNo: _orderNo,
    kitchenAskedAt: _kitchenAskedAt,
    kitchenSentAt: _kitchenSentAt,
    ...details
  } = order
  await sql`UPDATE bakery_cake_orders SET payload=${encode(details)},updated_at=now() WHERE id=${order.id}`
}

/** Finds the custom order made from an inquiry, if any (newest first). */
export async function findOrderForInquiry(inquiryId: string) {
  const orders = await listCakeOrders()
  return orders.find(o => o.inquiryId === inquiryId && o.status !== 'failed') ?? null
}
