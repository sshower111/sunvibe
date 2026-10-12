import { NextRequest, NextResponse } from 'next/server'
import { readBody, parseForm } from '@/lib/request-body'
import { mailer, EMAIL_FROM, bakeryInbox } from '@/lib/email'
import { SITE } from '@/lib/site-info'
import { preOrderSchema, priceOrder } from '@/lib/pre-order'
import { getCampaign } from '@/lib/campaigns'
import { saveOrder } from '@/lib/pre-orders-store'
import { verifyTurnstile } from '@/lib/turnstile'
import { rateLimiter, getClientIp } from '@/lib/security'
export const runtime = 'nodejs'
const fail = (error: string, status: number) => NextResponse.json({ error }, { status })
export async function POST(request: NextRequest) {
  try {
    if (!rateLimiter.check('preorder:' + getClientIp(request), 5, 10 * 60 * 1000))
      return fail('Please wait 10 minutes or call the bakery.', 429)
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data;'))
      return fail('Submit the reservation form.', 415)
    const raw = await readBody(request, 65536)
    if (!raw.ok)
      return fail(raw.reason === 'empty' ? 'Empty form' : 'Form is too large', raw.reason === 'empty' ? 400 : 413)
    let form: FormData
    let items: unknown
    try {
      form = await parseForm(request, raw.body)
      items = JSON.parse(String(form.get('items')))
    } catch {
      return fail('Invalid form data', 400)
    }
    const parsed = preOrderSchema.safeParse({ ...Object.fromEntries(form.entries()), items })
    if (!parsed.success) return fail(parsed.error.issues[0].message, 400)
    if (!process.env.RESEND_API_KEY || !process.env.TURNSTILE_SECRET_KEY)
      return fail(`Online reservations are temporarily unavailable. Please call ${SITE.phone}.`, 503)
    if (!(await verifyTurnstile(form.get('captchaToken'), 'pre_order')))
      return fail('Please try verification again.', 403)
    const input = parsed.data
    const campaign = await getCampaign(input.campaignId)
    if (!campaign) return fail('This occasion is no longer available.', 404)
    let priced
    try {
      priced = priceOrder(input, campaign)
    } catch (error) {
      return fail((error as Error).message, 400)
    }
    const order = await saveOrder({
      id: input.requestId,
      campaignId: campaign.id,
      campaignName: campaign.name,
      createdAt: new Date().toISOString(),
      name: input.name,
      phone: input.phone,
      email: input.email,
      pickupDate: input.pickupDate,
      items: priced,
      fulfillment: input.fulfillment,
      notes: input.notes,
      status: 'new',
    })
    // Idempotent request IDs prevent duplicate reservations and notification emails.
    if (order.campaignId !== input.campaignId || order.phone !== input.phone || order.name !== input.name)
      return fail('Please refresh and try again.', 409)
    const cents = order.items.reduce((n, item) => n + Math.round(item.price * 100) * item.qty, 0)
    const text = [
      ...order.items.map(i => i.qty + ' × ' + i.name + ' @ $' + i.price.toFixed(2)),
      'Estimated items total: $' + (cents / 100).toFixed(2),
      'Fulfillment: ' + order.fulfillment,
      'Name: ' + order.name,
      'Phone: ' + order.phone,
      'Email: ' + (order.email || 'Not provided'),
      'Pickup: ' + order.pickupDate,
      'Notes: ' + order.notes,
      'Reservation request only — call to confirm availability, delivery fees, and pickup time.',
    ].join('\n')
    const resend = mailer()
    let notificationSent = false
    try {
      const result = await resend.emails.send(
        {
          from: EMAIL_FROM,
          to: bakeryInbox(),
          ...(order.email ? { replyTo: order.email } : {}),
          subject: 'Festival pre-order: ' + order.name + ' — ' + order.pickupDate + ' (' + campaign.name + ')',
          text,
        },
        { idempotencyKey: 'preorder-' + order.id },
      )
      notificationSent = !result.error
    } catch {}
    // Swap the email-to-SMS gateway for Twilio later if volume grows.
    if (process.env.SMS_GATEWAY_EMAIL) {
      try {
        await resend.emails.send(
          {
            from: EMAIL_FROM,
            to: process.env.SMS_GATEWAY_EMAIL,
            subject: 'New pre-order',
            text:
              'New pre-order: ' +
              order.name +
              ', ' +
              order.items.reduce((n, i) => n + i.qty, 0) +
              ' items, pickup ' +
              order.pickupDate +
              ', ' +
              order.phone,
          },
          { idempotencyKey: 'preorder-sms-' + order.id },
        )
      } catch {}
    }
    return NextResponse.json({
      success: true,
      message: notificationSent
        ? 'Reservation request received. The bakery will call to confirm.'
        : `Your request is saved. Please call ${SITE.phone} to confirm; the email notification could not be delivered.`,
    })
  } catch {
    return fail(`Your reservation could not be confirmed saved. Retry or call ${SITE.phone}.`, 503)
  }
}
