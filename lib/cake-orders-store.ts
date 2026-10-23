import 'server-only'
import { verifiedDatabase } from './database'
import { encode, decode } from './storage-crypto'
import { vegasInstant, type CakeOrderStatus, type StoredCakeOrder } from './cake-order'

const contentDatabase = () => verifiedDatabase('content')
type Row = { payload: string; status: string; payment_id: string | null; approve_by: Date | string | null }
const toOrder = (r: Row): StoredCakeOrder => ({
  ...(decode(r.payload) as StoredCakeOrder),
  status: r.status as CakeOrderStatus,
  paymentId: r.payment_id ?? undefined,
  approveBy: r.approve_by ? new Date(r.approve_by).toISOString() : undefined,
})

export async function listCakeOrders(): Promise<StoredCakeOrder[]> {
  const sql = await contentDatabase()
  const rows =
    await sql`SELECT payload,status,payment_id,approve_by FROM bakery_cake_orders WHERE status <> 'failed' OR created_at > now() - interval '2 days' ORDER BY created_at DESC LIMIT 500`
  return rows.map(r => toOrder(r as unknown as Row))
}

export async function getCakeOrder(id: string) {
  const sql = await contentDatabase()
  const rows = await sql`SELECT payload,status,payment_id,approve_by FROM bakery_cake_orders WHERE id=${id}`
  return rows.length ? toOrder(rows[0] as unknown as Row) : null
}

export async function findCakeOrderByPayment(paymentId: string) {
  const sql = await contentDatabase()
  const rows =
    await sql`SELECT payload,status,payment_id,approve_by FROM bakery_cake_orders WHERE payment_id=${paymentId}`
  return rows.length ? toOrder(rows[0] as unknown as Row) : null
}

/**
 * Reserves the order before the card is charged, so a payment is never taken without a saved order.
 * Returns false when this request ID already has an order that isn't a failed attempt.
 */
export async function startCakeOrder(order: StoredCakeOrder) {
  const sql = await contentDatabase()
  const pickupAt = vegasInstant(order.pickupDate, order.pickupTime).toISOString()
  const rows = await sql`INSERT INTO bakery_cake_orders(id,payload,status,pickup_at,created_at)
    VALUES(${order.id},${encode(order)},'processing',${pickupAt},${order.createdAt})
    ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,status='processing',pickup_at=EXCLUDED.pickup_at,updated_at=now()
    WHERE bakery_cake_orders.status='failed'
    RETURNING id`
  return rows.length > 0
}

export async function finishCakeOrder(
  id: string,
  change: { status: CakeOrderStatus; paymentId?: string; approveBy?: string },
) {
  const sql = await contentDatabase()
  await sql`UPDATE bakery_cake_orders SET status=${change.status},payment_id=COALESCE(${change.paymentId ?? null},payment_id),
    approve_by=${change.approveBy ?? null},updated_at=now() WHERE id=${id}`
}

/** Deletes an order made with admin "Test order". Real orders can't be deleted. */
export async function deleteTestOrder(id: string) {
  const order = await getCakeOrder(id)
  if (!order?.test) throw new Error('Only test orders can be deleted.')
  const sql = await contentDatabase()
  await sql`DELETE FROM bakery_cake_orders WHERE id=${id}`
}

/** Moves an order on only if it is still in the expected status; returns whether it changed. */
export async function moveCakeOrder(id: string, from: CakeOrderStatus, to: CakeOrderStatus) {
  const sql = await contentDatabase()
  const rows =
    await sql`UPDATE bakery_cake_orders SET status=${to},updated_at=now() WHERE id=${id} AND status=${from} RETURNING id`
  return rows.length > 0
}
