import 'server-only'
import { getMenuProducts } from '@/lib/menu-products'
import type { MarqueeItem } from '@/components/bakery-marquee'

// Shown if the menu cannot be read (for example during a database outage).
const fallback: MarqueeItem[] = [
  {
    id: 'prod_TBefDXpMZYaNs2',
    name: 'BBQ Pork Bun 叉燒包',
    image:
      'https://pbamlokgnomamommrofy.supabase.co/storage/v1/object/public/bakery-images/migrated/230c10af71eee8de-e67a0a8a6dd5cee1.jpg',
  },
  { id: 'prod_TBefJiLFwDD33u', name: 'Pineapple Bun 菠蘿包', image: 'https://i.ibb.co/dshSM9xk/pineBun.webp' },
  {
    id: 'prod_TBefBiX4QUqIT5',
    name: 'Red Bean Mooncake 紅豆月餅',
    image:
      'https://pbamlokgnomamommrofy.supabase.co/storage/v1/object/public/bakery-images/migrated/60a9fe48b611b3bd-7e78ea74575dff8c.jpg',
  },
]

const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))

// Every menu item that has a real photo, in menu order. New photos added in Admin show up here
// on the next page refresh (the home page is rebuilt at most every 15 minutes).
export async function getMarqueeItems(): Promise<MarqueeItem[]> {
  try {
    const products = await Promise.race([getMenuProducts(), timeout(8000)])
    const items = products
      .filter(p => p.image && !p.image.includes('/placeholder') && !['null', 'undefined'].includes(p.image))
      .map(p => ({ id: p.id, name: p.name, image: p.image }))
    return items.length >= 4 ? items : fallback
  } catch {
    return fallback
  }
}
