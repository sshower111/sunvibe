import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdminRequest } from '@/lib/admin-auth'
import { listCakeInquiries, updateCakeInquiry } from '@/lib/cake-inquiries-store'
import { cakeInquirySchema, earliestCakeDate, inquiryStatuses, MAX_STAFF_NOTES } from '@/lib/cake-inquiry'
import { cakeCatalog } from '@/lib/cake-catalog'
import { bakeryInbox } from '@/lib/email'
import { sendBakeryEmail, sendCustomerCopy } from '@/lib/cake-inquiry-email'

const updateSchema = z.union([
  z.object({ action: z.literal('status'), id: z.string().uuid(), status: z.enum(inquiryStatuses) }),
  z.object({ action: z.literal('notes'), id: z.string().uuid(), staffNotes: z.string().max(MAX_STAFF_NOTES) }),
])

export async function POST(req: NextRequest) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!(await isAdminRequest(body?.password))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    if (body.action === 'test') return sendTestInquiry()
    if (body.action === 'list')
      return NextResponse.json({ inquiries: await listCakeInquiries() }, { headers: { 'Cache-Control': 'no-store' } })
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 })
    const change = parsed.data
    await updateCakeInquiry(
      change.id,
      change.action === 'status' ? { status: change.status } : { staffNotes: change.staffNotes.trim() },
    )
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Cake inquiries unavailable. Please retry.' }, { status: 503 })
  }
}

// "Send test inquiry" in admin: a sample inquiry through the real email code, so the inbox shows exactly what a
// customer's would look like. Both emails go to the bakery inbox with [TEST] subjects. Not saved to the tracker.
async function sendTestInquiry() {
  if (!process.env.RESEND_API_KEY)
    return NextResponse.json({ error: 'Email is not set up (RESEND_API_KEY).' }, { status: 503 })
  const sample = cakeInquirySchema.parse({
    name: 'Test Customer',
    email: bakeryInbox(),
    phone: '(702) 555-0100',
    eventDate: earliestCakeDate(),
    eventTime: '14:30',
    eventType: 'Birthday',
    servings: '20',
    size: cakeCatalog[0].value,
    flavor: 'Pandan',
    filling: 'Mango',
    cakeMessage: 'Happy Birthday, Test!',
    budget: '$100–$200',
    fulfillment: 'Pickup',
    deliveryAddress: '',
    notes: 'This is a test inquiry sent from the admin page.',
    acknowledged: 'yes',
  })
  const requestId = crypto.randomUUID()
  if (!(await sendBakeryEmail(sample, { requestId, test: true })))
    return NextResponse.json({ error: 'The test email could not be sent. Check Resend.' }, { status: 502 })
  await sendCustomerCopy(sample, { requestId, test: true })
  return NextResponse.json({ success: true, sentTo: bakeryInbox() })
}
