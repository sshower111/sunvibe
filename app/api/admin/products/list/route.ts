import { isAdminRequest } from '@/lib/occasion-admin'
import { NextRequest, NextResponse } from 'next/server'
import { usesDatabase } from '@/lib/database'
import { databaseProductRequest } from '@/lib/database-product-api'


export async function POST(req: NextRequest) {
  if (usesDatabase('menu')) return databaseProductRequest(req, 'list')
  const { stripe } = await import('@/lib/stripe')
  try {
    const { password } = await req.json()

    // Verify password
    if (!(await isAdminRequest(password))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch ALL products (both active and inactive)
    const products = await stripe.products.list({
      limit: 100,
      expand: ['data.default_price'],
    })

    // Transform Stripe products into our format
    const formattedProducts = products.data.map((product) => {
      const price = product.default_price as any

      return {
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: price ? (price.unit_amount / 100).toFixed(2) : '0.00',
        priceId: price?.id || '',
        image: product.images[0] || '/placeholder.svg',
        category: product.metadata?.category || 'Buns',
        active: product.active,
      }
    })

    return NextResponse.json({ products: formattedProducts })

  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
