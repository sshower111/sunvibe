import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { priceId, productName, items } = body

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

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      success_url: `${request.nextUrl.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/menu`,
      metadata: {
        productName: productName || 'Cart items',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
