import { connection } from 'next/server'
import MenuPage from '@/components/menu-page'
import { getMenuProducts } from '@/lib/menu-products'

// Render per request instead of at build time: the build was timing out waiting on the menu
// database. The menu data itself is still cached (lib/menu-products.ts), so this does not add database queries.
const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Menu timed out')), ms))

export default async function Page() {
  await connection()
  // A slow database shows the "couldn't load the menu" state with a Retry button instead of hanging.
  try { return <MenuPage initialProducts={await Promise.race([getMenuProducts(), timeout(10000)])} /> }
  catch { return <MenuPage initialProducts={[]} initialError /> }
}
