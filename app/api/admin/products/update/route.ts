import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'

const inputSchema = z.object({
  productId: z.string().regex(/^prod_[a-zA-Z0-9]+$/),
  name: z.string().trim().min(1, 'Enter an item name.').max(250, 'Name must be 250 characters or fewer.'),
  description: z.string().max(2000, 'Description must be 2000 characters or fewer.').transform(value => value.trim()),
  price: z.string().regex(/^\d{1,6}(?:\.\d{1,2})?$/, 'Enter a price from $0 to $999,999.99 with at most two decimal places.'),
  requestId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  let body
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  const secret = process.env.ADMIN_PASSWORD
  if (!secret || typeof body?.password !== 'string' || !timingSafeEqual(
    createHash('sha256').update(body.password).digest(), createHash('sha256').update(secret).digest(),
  )) return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 })
  const parsed = inputSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { productId, name, description, price, requestId } = parsed.data
  const [dollars, fraction = ''] = price.split('.')
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, '0'))
  try {
    // Read the actual default price; never trust a client-supplied price ID.
    const current = await stripe.products.retrieve(productId, { expand: ['default_price'] })
    const existing = typeof current.default_price === 'object' ? current.default_price : null
    if (existing && (existing.currency !== 'usd' || existing.type !== 'one_time' || existing.billing_scheme !== 'per_unit')) {
      return NextResponse.json({ error: 'This item uses special pricing. Please edit it in Stripe.' }, { status: 400 })
    }
    let priceId = existing?.id
    if (!existing || existing.unit_amount !== cents) {
      const replacement = await stripe.prices.create({ product: productId, unit_amount: cents, currency: 'usd' }, { idempotencyKey: 'menu-price-' + requestId })
      priceId = replacement.id
    }
    // Switch name, description and default price together. Keep the old price intact
    // for checkout/history; a failed price creation cannot partially edit the item.
    const product = await stripe.products.update(productId, { name, description, default_price: priceId }, { idempotencyKey: 'menu-item-' + requestId })
    revalidateTag('menu-products')
    return NextResponse.json({ success: true, product: { id: product.id, name: product.name, description: product.description || '', price: (cents / 100).toFixed(2), priceId } })
  } catch {
    return NextResponse.json({ error: 'Unable to save the item. Your draft is still here; please try again.' }, { status: 502 })
  }
}
