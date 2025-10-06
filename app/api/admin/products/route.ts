import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD

// CREATE new product
export async function POST(req: NextRequest) {
  try {
    const { name, description, price, category, image, password } = await req.json()

    // Verify password
    if (password !== ADMIN_PASSWORD) {
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

// UPDATE existing product
export async function PUT(req: NextRequest) {
  try {
    const { productId, priceId, name, description, price, category, image, password } = await req.json()

    // Verify password
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate required fields
    if (!productId || !name || !price) {
      return NextResponse.json({ error: 'Product ID, name, and price are required' }, { status: 400 })
    }

    // Update product in Stripe
    const product = await stripe.products.update(productId, {
      name,
      description: description || '',
      images: image ? [image] : [],
      metadata: {
        category: category || 'Buns',
      },
    })

    // Check if price has changed
    const currentPrice = await stripe.prices.retrieve(priceId)
    const newPriceAmount = Math.round(parseFloat(price) * 100)

    let newPriceId = priceId

    if (currentPrice.unit_amount !== newPriceAmount) {
      // Archive the old price
      await stripe.prices.update(priceId, {
        active: false,
      })

      // Create new price
      const stripePrice = await stripe.prices.create({
        product: productId,
        unit_amount: newPriceAmount,
        currency: 'usd',
      })

      newPriceId = stripePrice.id

      // Update product's default price
      await stripe.products.update(productId, {
        default_price: stripePrice.id,
      })
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: price,
        priceId: newPriceId,
        image: product.images[0] || '',
        category: product.metadata.category,
      }
    })

  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

// DELETE product
export async function DELETE(req: NextRequest) {
  try {
    const { productId, password } = await req.json()

    // Verify password
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Archive (deactivate) the product in Stripe instead of deleting
    // This preserves historical data and prevents issues with existing orders
    await stripe.products.update(productId, {
      active: false,
    })

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
