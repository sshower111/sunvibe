import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SITE } from '@/lib/site-info'
import { cardErrorMessage, squareClientConfig, SquareError } from '@/lib/square'
import { payCustomOrder, PayError } from '@/lib/custom-cake-orders'
import { getClientIp, rateLimiter } from '@/lib/security'

export const runtime = 'nodejs'
const fail = (error: string, status: number) => NextResponse.json({ error }, { status })
const bodySchema = z.object({ cardToken: z.string().min(1).max(2048).optional() })

// Custom cake pay link: /pay/<order id>. The random order ID is the link's secret; there's no other login.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail('Payment link not found.', 404)
  if (!(await rateLimiter.check('pay:' + getClientIp(request), 8, 10 * 60 * 1000)))
    return fail(`Too many attempts. Please wait 10 minutes or call ${SITE.phone}.`, 429)
  if (!squareClientConfig()) return fail(`Online payment is unavailable right now. Please call ${SITE.phone}.`, 503)
  let body
  try {
    const raw = await request.text()
    if (raw.length > 8192) return fail('Request is too large.', 413)
    body = bodySchema.parse(JSON.parse(raw))
  } catch {
    return fail('Please refresh the page and try again.', 400)
  }
  try {
    return NextResponse.json({ success: true, ...(await payCustomOrder(id, body.cardToken)) })
  } catch (error) {
    if (error instanceof PayError) return fail(error.message, 409)
    const code = error instanceof SquareError ? error.code : 'UNKNOWN'
    console.error('Square payment failed (custom cake)', { code, detail: (error as Error).message })
    return fail(
      cardErrorMessage(error) || `The payment didn't go through (${code}). Please try again or call ${SITE.phone}.`,
      402,
    )
  }
}
