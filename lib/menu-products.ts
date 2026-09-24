import 'server-only'
import Stripe from 'stripe'
import { unstable_cache } from 'next/cache'
import type { MenuProduct } from '@/lib/menu'
// Cache public catalog data only; no customer/payment fields leave this module.
export const getMenuProducts = unstable_cache(async (): Promise<MenuProduct[]> => {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Menu service is not configured')
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 8000, maxNetworkRetries: 0 })
  const products: MenuProduct[] = []
  for await (const product of stripe.products.list({ active: true, expand: ['data.default_price'], limit: 100 })) {
    const price = typeof product.default_price === 'object' ? product.default_price : null
    products.push({ id: product.id, name: product.name, description: product.description || '',
      price: price?.unit_amount != null ? (price.unit_amount / 100).toFixed(2) : '0.00',
      priceId: price?.id || '', image: product.images[0] || '/placeholder.svg', category: product.metadata?.category || 'Buns' })
  }
  return products
}, ['public-menu-v1'], { revalidate: 60, tags: ['menu-products'] })
