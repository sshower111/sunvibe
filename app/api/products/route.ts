import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET() {
  try {
    // Fetch all active products with their prices
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
      limit: 100,
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
      }
    })

    console.log(`📦 Products API: Returning ${formattedProducts.length} products`)
    console.log('Categories:', [...new Set(formattedProducts.map(p => p.category))].join(', '))
    console.log('Sample product:', formattedProducts[0])

    return NextResponse.json(formattedProducts, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
