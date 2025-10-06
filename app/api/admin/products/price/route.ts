import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

export async function POST(req: NextRequest) {
  try {
    const { productId, priceId, price, password } = await req.json()

    // Verify password
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!productId || !price) {
      return NextResponse.json({ error: 'Product ID and price are required' }, { status: 400 })
    }

    const newPriceAmount = Math.round(parseFloat(price) * 100) // Convert to cents

    // Archive the old price if it exists
    if (priceId) {
      await stripe.prices.update(priceId, {
        active: false,
      })
    }

    // Create new price
    const newPrice = await stripe.prices.create({
      product: productId,
      unit_amount: newPriceAmount,
      currency: 'usd',
    })

    // Update product's default price
    await stripe.products.update(productId, {
      default_price: newPrice.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Price updated successfully',
      newPriceId: newPrice.id
    })

  } catch (error) {
    console.error('Error updating price:', error)
    return NextResponse.json(
      { error: 'Failed to update price' },
      { status: 500 }
    )
  }
}
