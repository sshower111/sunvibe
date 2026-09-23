import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { constantTimeCompare } from '@/lib/security'

export async function POST(req: NextRequest) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const { productId, description, password } = body || {}
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword || typeof password !== 'string' || !constantTimeCompare(password, adminPassword)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (typeof productId !== 'string' || !/^prod_[a-zA-Z0-9]+$/.test(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
  }
  if (typeof description !== 'string' || description.length > 2000) {
    return NextResponse.json({ error: 'Description must be text with at most 2000 characters' }, { status: 400 })
  }
  try {
    const product = await stripe.products.update(productId, { description: description.trim() })
    return NextResponse.json({ success: true, description: product.description || '' })
  } catch (error) {
    console.error('Error updating description:', error)
    return NextResponse.json({ error: 'Failed to save description. Please try again.' }, { status: 500 })
  }
}
