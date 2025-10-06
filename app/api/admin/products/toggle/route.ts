import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

export async function POST(req: NextRequest) {
  try {
    const { productId, active, password } = await req.json()

    // Verify password
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Toggle product active status in Stripe
    await stripe.products.update(productId, {
      active: active,
    })

    return NextResponse.json({
      success: true,
      message: `Product ${active ? 'activated' : 'deactivated'} successfully`
    })

  } catch (error) {
    console.error('Error toggling product:', error)
    return NextResponse.json(
      { error: 'Failed to toggle product' },
      { status: 500 }
    )
  }
}
