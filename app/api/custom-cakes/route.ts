import { NextRequest, NextResponse } from 'next/server'
import { readBody, parseForm } from '@/lib/request-body'
import { SITE } from '@/lib/site-info'
import { cakeInquirySchema, MAX_PHOTOS, MAX_PHOTO_BYTES } from '@/lib/cake-inquiry'
import { saveCakeInquiry } from '@/lib/cake-inquiries-store'
import { sendBakeryEmail, sendCustomerCopy } from '@/lib/cake-inquiry-email'
import { verifyTurnstile } from '@/lib/turnstile'
import { getClientIp, rateLimiter } from '@/lib/security'

export const runtime = 'nodejs'
const fail = (error: string, status: number) => NextResponse.json({ error }, { status })
export async function POST(request: NextRequest) {
  try {
    if (!rateLimiter.check(`cake:${getClientIp(request)}`, 5, 10 * 60 * 1000))
      return fail('Too many attempts. Please try again in 10 minutes or call the bakery.', 429)
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data;'))
      return fail('Please submit the inquiry form.', 415)
    const raw = await readBody(request, MAX_PHOTOS * MAX_PHOTO_BYTES + 65536)
    if (!raw.ok)
      return raw.reason === 'empty'
        ? fail('Your inquiry is empty.', 400)
        : fail('Photos are too large. Please remove one and try again.', 413)
    let form: FormData
    try {
      form = await parseForm(request, raw.body)
    } catch {
      return fail('The upload could not be read. Please try again.', 400)
    }
    const parsed = cakeInquirySchema.safeParse(Object.fromEntries(form.entries()))
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Please check your inquiry details.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    const requestId = form.get('requestId')
    if (typeof requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(requestId))
      return fail('Please refresh the page and try again.', 400)
    const photos = form.getAll('photos')
    if (photos.length > MAX_PHOTOS) return fail(`Please attach up to ${MAX_PHOTOS} photos.`, 400)
    const attachments: { filename: string; content: Buffer }[] = []
    for (const [i, photo] of photos.entries()) {
      if (typeof photo === 'string' || photo.size === 0 || photo.size > MAX_PHOTO_BYTES)
        return fail('One of the photos is too large. Please remove it and try again.', 400)
      const data = Buffer.from(await photo.arrayBuffer())
      const ext =
        data.length > 12 && data.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
          ? 'jpg'
          : data.length > 24 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            ? 'png'
            : data.length > 16 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP'
              ? 'webp'
              : null
      if (!ext || photo.type !== { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext])
        return fail('Use JPG, PNG, or WebP photos. Other file types are not accepted.', 400)
      attachments.push({ filename: `cake-reference-${i + 1}.${ext}`, content: data })
    }
    if (!process.env.TURNSTILE_SECRET_KEY || !process.env.TURNSTILE_ALLOWED_HOSTNAMES || !process.env.RESEND_API_KEY)
      return fail(`Online inquiries are temporarily unavailable. Please call ${SITE.phone}.`, 503)
    if (!(await verifyTurnstile(form.get('captchaToken'), 'custom_cake')))
      return fail('Please complete verification and try again.', 403)
    const sent = await sendBakeryEmail(parsed.data, { requestId, attachments })
    if (!sent)
      return fail('Your inquiry could not be sent. Your details are still here; please retry or call the bakery.', 502)
    // The email is the primary record; a tracker outage must not fail an inquiry that was delivered.
    try {
      const { acknowledged: _, ...details } = parsed.data
      await saveCakeInquiry({
        ...details,
        id: requestId,
        createdAt: new Date().toISOString(),
        photoCount: attachments.length,
      })
    } catch (error) {
      console.error('Cake inquiry emailed but not saved to the tracker', requestId, error)
    }
    // Copy for the customer. Replies go to the bakery, so changes arrive in one thread instead of a second form.
    await sendCustomerCopy(parsed.data, { requestId })
    return NextResponse.json({ success: true })
  } catch {
    return fail('Your inquiry could not be sent. Please retry or call the bakery.', 500)
  }
}
