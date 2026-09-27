import { isAdminRequest } from '@/lib/occasion-admin'
import { NextRequest, NextResponse } from 'next/server'
import { usesDatabase } from '@/lib/database'
import { databaseProductRequest } from '@/lib/database-product-api'


export async function POST(req: NextRequest) {
  if (usesDatabase('menu')) return databaseProductRequest(req, 'toggle')
  const { stripe } = await import('@/lib/stripe')
  try {
    const { productId, active, password } = await req.json()

    // Verify password
    if (!(await isAdminRequest(password))) {
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
