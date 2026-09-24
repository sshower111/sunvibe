import MenuPage from '@/components/menu-page'
import { getMenuProducts } from '@/lib/menu-products'
export default async function Page() {
  try { return <MenuPage initialProducts={await getMenuProducts()} /> }
  catch { return <MenuPage initialProducts={[]} initialError /> }
}
