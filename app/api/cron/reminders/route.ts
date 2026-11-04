import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { listCakeOrdersSettled } from '@/lib/cake-order-actions'
import { claimReminder, pushToAdmins } from '@/lib/push'
import { dueReminders } from '@/lib/push-messages'

export const runtime = 'nodejs'

// Reminder pushes and Discord messages (lib/push-messages.ts dueReminders), including 1 hour before pickup. Called every 15 minutes by a Supabase cron job with
// "Authorization: Bearer <CRON_SECRET>" (setup: docs/ADMIN_GUIDE.md). Each reminder is sent once.
function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const given = request.headers.get('authorization') ?? ''
  const expected = 'Bearer ' + secret
  return !!secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

async function run(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    // Also settles held orders whose answer time passed (cancels the hold and tells the customer).
    const orders = await listCakeOrdersSettled()
    let sent = 0
    let discord = 0
    for (const reminder of dueReminders(orders))
      if (await claimReminder(reminder.orderId, reminder.kind)) {
        const result = await pushToAdmins(reminder.push)
        sent += result.sent
        if (result.discord) discord++
      }
    return NextResponse.json({ ok: true, sent, discord })
  } catch (error) {
    console.error('Reminder job failed', (error as Error).message)
    return NextResponse.json({ error: 'Retry later' }, { status: 500 })
  }
}
export const GET = run
export const POST = run
