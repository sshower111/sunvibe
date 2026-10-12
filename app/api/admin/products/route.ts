import { isAdminRequest } from '@/lib/occasion-admin'
import { NextRequest, NextResponse } from 'next/server'
import { usesDatabase } from '@/lib/database'
import { databaseProductRequest } from '@/lib/database-product-api'


// CREATE new product
export async function POST(req: NextRequest) {
  if (usesDatabase('menu')) return databaseProductRequest(req, 'POST')
  const { stripe } = await import('@/lib/stripe')
  try {
    const { name, description, price, category, image, password } = await req.json()

    // Verify password
    if (!(await isAdminRequest(password))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate required fields
    if (!name || !price) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 })
    }

    // Create product in Stripe
    const product = await stripe.products.create({
      name,
      description: description || '',
      images: image ? [image] : [],
      metadata: {
        category: category || 'Buns',
      },
      active: true,
    })

    // Create price for the product
    const priceAmount = Math.round(parseFloat(price) * 100) // Convert to cents

    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: priceAmount,
      currency: 'usd',
    })

    // Set the default price
    await stripe.products.update(product.id, {
      default_price: stripePrice.id,
    })

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: price,
        priceId: stripePrice.id,
        image: product.images[0] || '',
        category: product.metadata.category,
      }
    })

  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
