import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdminRequest } from '@/lib/admin-auth'
import { listCakeInquiries, updateCakeInquiry } from '@/lib/cake-inquiries-store'
import { inquiryStatuses, MAX_STAFF_NOTES } from '@/lib/cake-inquiry'

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
