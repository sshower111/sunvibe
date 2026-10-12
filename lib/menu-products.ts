import 'server-only'
import { unstable_cache } from 'next/cache'
import { databaseMenu } from './database-menu'
import type { MenuProduct } from '@/lib/menu'
// Public menu (active items only), cached. Admin edits call revalidateTag('menu-products').
export const getMenuProducts = unstable_cache(async (): Promise<MenuProduct[]> => databaseMenu(), ['public-menu-v3'], {
  revalidate: 86400,
  tags: ['menu-products'],
})
