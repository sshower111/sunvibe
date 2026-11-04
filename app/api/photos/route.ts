import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import sharp from 'sharp'
import { getCakeOrder } from '@/lib/cake-orders-store'
import { imageTypeOf } from '@/lib/image-type'
import { readBody, parseForm } from '@/lib/request-body'
import { getClientIp, rateLimiter } from '@/lib/security'
import {
  addSubmissionPhoto,
  MAX_NOTE,
  MAX_PHOTOS_PER_ORDER,
  photoCountForOrder,
  saveSubmission,
} from '@/lib/customer-photos'
import { acceptsPhotos } from '@/lib/thank-you'

export const runtime = 'nodejs'

// The photo page from the thank-you email (/photos/<order id>): each request carries at most one photo (Vercel
// limits a request to 4.5 MB), plus the note and the "OK to show on your website" answer. No sign-in: the order id
// in the link is the key, and only an order that was picked up recently accepts photos.
const MAX_BYTES = 4 * 1024 * 1024
const fields = z.object({
  order: z.string().uuid(),
  submission: z.string().uuid(),
  note: z.string().max(MAX_NOTE).default(''),
  consent: z.enum(['yes', 'no']).default('no'),
})
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(req: NextRequest) {
  try {
    if (!(await rateLimiter.check(`customer-photos:${getClientIp(req)}`, 40, 60 * 60 * 1000)))
      return fail('Too many uploads. Please try again in an hour.', 429)
    if (!req.headers.get('content-type')?.startsWith('multipart/form-data')) return fail('Invalid request')
    const raw = await readBody(req, MAX_BYTES + 65536)
    if (!raw.ok) return fail(raw.reason === 'empty' ? 'Invalid request' : 'This photo is too large.', 413)
    const form = await parseForm(req, raw.body)
    const parsed = fields.safeParse({
      order: form.get('order'),
      submission: form.get('submission'),
      note: (form.get('note') as string | null) ?? '',
      consent: (form.get('consent') as string | null) ?? 'no',
    })
    if (!parsed.success) return fail('Invalid request')
    const { order: orderId, submission, note, consent } = parsed.data
    const order = await getCakeOrder(orderId)
    if (!order || !acceptsPhotos(order)) return fail('This link is no longer active.', 404)

    await saveSubmission({ id: submission, orderId, note: note.trim(), consent: consent === 'yes' })
    const file = form.get('file')
    if (file && typeof file !== 'string') {
      if ((await photoCountForOrder(orderId)) >= MAX_PHOTOS_PER_ORDER)
        return fail(`Thank you! We already have ${MAX_PHOTOS_PER_ORDER} photos for this order.`, 409)
      const data = Buffer.from(await file.arrayBuffer())
      if (!imageTypeOf(data)) return fail('Please choose a photo (JPG, PNG or HEIC).')
      // Upright, at most 2,000 px, no metadata (so no GPS location), like gallery photos.
      const jpeg = await sharp(data)
        .rotate()
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer()
      await addSubmissionPhoto(submission, orderId, jpeg)
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Customer photo not saved', (error as Error).message)
    return fail('Something went wrong. Please try again.', 503)
  }
}
