import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { sanitizePickupTime, rateLimiter, getClientIp, escapeHtml } from '@/lib/security'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 checkouts per hour per IP
    const clientIp = getClientIp(request)
    if (!rateLimiter.check(`checkout:${clientIp}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many checkout attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { priceId, productName, items, pickupTime } = body

    // Validate and sanitize pickup time
    const safePickupTime = sanitizePickupTime(pickupTime)
    console.log("📦 Checkout API - Sanitized pickup time:", safePickupTime)

    let lineItems

    if (items && Array.isArray(items)) {
      // Validate items array
      if (items.length === 0 || items.length > 50) {
        return NextResponse.json(
          { error: 'Invalid items count' },
          { status: 400 }
        )
      }

      // Validate each item
      for (const item of items) {
        if (!item.priceId || typeof item.priceId !== 'string') {
          return NextResponse.json(
            { error: 'Invalid price ID' },
            { status: 400 }
          )
        }
        if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity > 99) {
          return NextResponse.json(
            { error: 'Invalid quantity' },
            { status: 400 }
          )
        }
      }

      // Multiple items from cart
      lineItems = items.map((item: { priceId: string; quantity: number }) => ({
        price: item.priceId,
        quantity: item.quantity,
      }))
    } else if (priceId) {
      // Validate single price ID
      if (typeof priceId !== 'string' || !priceId.startsWith('price_')) {
        return NextResponse.json(
          { error: 'Invalid price ID format' },
          { status: 400 }
        )
      }

      // Single item (Buy Now)
      lineItems = [
        {
          price: priceId,
          quantity: 1,
        },
      ]
    } else {
      return NextResponse.json(
        { error: 'Price ID or items array is required' },
        { status: 400 }
      )
    }

    // Apply tax rates to line items if configured
    const taxRateId = process.env.STRIPE_TAX_RATE_ID
    if (taxRateId) {
      lineItems = lineItems.map((item: any) => ({
        ...item,
        tax_rates: [taxRateId],
      }))
    }

    // Sanitize product name if provided
    const safeProductName = productName
      ? escapeHtml(String(productName).substring(0, 100))
      : 'Cart items'

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      success_url: `${request.nextUrl.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/menu`,
      metadata: {
        productName: safeProductName,
        pickupTime: safePickupTime,
      },
    })

    console.log("✅ Checkout API - Created session with metadata:", session.metadata)

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Checkout error:', error)
    console.error('Error details:', error.message, error.type)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
