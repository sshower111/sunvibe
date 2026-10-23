import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdminRequest } from '@/lib/admin-auth'
import { moveCakeOrder } from '@/lib/cake-orders-store'
import { approveOrder, declineOrder, listCakeOrdersSettled } from '@/lib/cake-order-actions'

const actionSchema = z.object({
  action: z.enum(['approve', 'decline', 'picked_up', 'not_picked_up']),
  id: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!(await isAdminRequest(body?.password))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    if (body.action === 'list')
      return NextResponse.json({ orders: await listCakeOrdersSettled() }, { headers: { 'Cache-Control': 'no-store' } })
    const parsed = actionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    const { action, id } = parsed.data
    if (action === 'approve') await approveOrder(id)
    else if (action === 'decline') await declineOrder(id)
    else if (
      !(await moveCakeOrder(
        id,
        action === 'picked_up' ? 'paid' : 'picked_up',
        action === 'picked_up' ? 'picked_up' : 'paid',
      ))
    )
      throw new Error('This order changed. Refresh the list.')
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'Cake orders unavailable. Please retry.'
    return NextResponse.json({ error: message }, { status: 409 })
  }
}
