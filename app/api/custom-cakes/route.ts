import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { cakeInquirySchema, MAX_PHOTOS, MAX_PHOTO_BYTES } from '@/lib/cake-inquiry'
import { cakeLabel } from '@/lib/cake-catalog'
import { verifyTurnstile } from '@/lib/turnstile'
import { escapeHtml, getClientIp, rateLimiter } from '@/lib/security'

export const runtime = 'nodejs'
const fail = (error: string, status: number) => NextResponse.json({ error }, { status })
export async function POST(request: NextRequest) {
  try {
    if (!rateLimiter.check(`cake:${getClientIp(request)}`, 5, 10 * 60 * 1000)) return fail('Too many attempts. Please try again in 10 minutes or call the bakery.', 429)
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) return fail('Please submit the inquiry form.', 415)
    const reader = request.body?.getReader()
    if (!reader) return fail('Your inquiry is empty.', 400)
    const chunks: Uint8Array[] = []; let bytes = 0
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      bytes += value.byteLength
      if (bytes > 3 * MAX_PHOTO_BYTES + 65536) { await reader.cancel(); return fail('Photos must total no more than 3 MB.', 413) }
      chunks.push(value)
    }
    let form: FormData
    try { form = await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': request.headers.get('content-type')! } }).formData() } catch { return fail('The upload could not be read. Please try again.', 400) }
    const parsed = cakeInquirySchema.safeParse(Object.fromEntries(form.entries()))
    if (!parsed.success) return NextResponse.json({ error: 'Please check your inquiry details.', fields: parsed.error.flatten().fieldErrors }, { status: 400 })
    const requestId = form.get('requestId')
    if (typeof requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(requestId)) return fail('Please refresh the page and try again.', 400)
    const photos = form.getAll('photos')
    if (photos.length > MAX_PHOTOS) return fail('Please attach up to 3 photos.', 400)
    const attachments: { filename: string; content: Buffer }[] = []
    for (const [i, photo] of photos.entries()) {
      if (typeof photo === 'string' || photo.size === 0 || photo.size > MAX_PHOTO_BYTES) return fail('Each photo must be between 1 byte and 1 MB.', 400)
      const data = Buffer.from(await photo.arrayBuffer())
      const ext = data.length > 12 && data.subarray(0, 3).equals(Buffer.from([255,216,255])) ? 'jpg' : data.length > 24 && data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' : data.length > 16 && data.toString('ascii',0,4) === 'RIFF' && data.toString('ascii',8,12) === 'WEBP' ? 'webp' : null
      if (!ext || photo.type !== ({ jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext])) return fail('Use JPG, PNG, or WebP photos. Other file types are not accepted.', 400)
      attachments.push({ filename: `cake-reference-${i + 1}.${ext}`, content: data })
    }
    if (!process.env.TURNSTILE_SECRET_KEY || !process.env.TURNSTILE_ALLOWED_HOSTNAMES || !process.env.RESEND_API_KEY) return fail('Online inquiries are temporarily unavailable. Please call 702-889-9887.', 503)
    if (!await verifyTurnstile(form.get('captchaToken'), 'custom_cake')) return fail('Please complete verification and try again.', 403)
    const values = { ...parsed.data, size: cakeLabel(parsed.data.size), deliveryAddress: parsed.data.fulfillment === 'Pickup' ? 'Bakery pickup' : parsed.data.deliveryAddress }
    const labels: Record<string, string> = { name: 'Name', email: 'Email', phone: 'Phone', eventDate: 'Event date', eventType: 'Event', servings: 'Servings requested', size: 'Cake size', flavor: 'Flavor preference', filling: 'Filling preference', budget: 'Budget', fulfillment: 'Pickup / delivery request', deliveryAddress: 'Delivery address / hotel', notes: 'Notes / dietary requests' }
    const text = Object.entries(labels).map(([key, label]) => `${label}: ${values[key as keyof typeof values] || 'None'}`).join('\n')
    const html = '<h2>Custom cake inquiry — quote requested</h2><p>This is not a confirmed order.</p>' + Object.entries(labels).map(([key, label]) => `<p><strong>${label}:</strong> ${escapeHtml(values[key as keyof typeof values] || 'None').replace(/\n/g, '<br>')}</p>`).join('')
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: 'Sunville Bakery Website <onboarding@resend.dev>', to: process.env.NOTIFICATION_EMAIL || 'sunvillebakerylv@gmail.com', replyTo: values.email,
      subject: `Custom cake inquiry: ${values.eventType} · ${values.eventDate}`, text, html, attachments,
    }, { idempotencyKey: `cake-${requestId}` })
    if (result.error) return fail('Your inquiry could not be sent. Your details are still here; please retry or call the bakery.', 502)
    return NextResponse.json({ success: true })
  } catch { return fail('Your inquiry could not be sent. Please retry or call the bakery.', 500) }
}
