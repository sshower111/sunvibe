import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { priceId, productName, items, pickupTime } = body

    console.log("📦 Checkout API - Received pickup time:", pickupTime)

    let lineItems

    if (items && Array.isArray(items)) {
      // Multiple items from cart
      lineItems = items.map((item: { priceId: string; quantity: number }) => ({
        price: item.priceId,
        quantity: item.quantity,
      }))
    } else if (priceId) {
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

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      success_url: `${request.nextUrl.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/menu`,
      metadata: {
        productName: productName || 'Cart items',
        pickupTime: pickupTime || 'ASAP',
      },
    })

    console.log("✅ Checkout API - Created session with metadata:", session.metadata)

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Checkout error:', error)
    console.error('Error details:', error.message, error.type)
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error.message },
      { status: 500 }
    )
  }
}
