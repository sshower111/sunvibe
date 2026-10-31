'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { AdminSegmented } from '@/components/admin-segmented'
import { AdminProductCreate } from '@/components/admin-product-create'
import { AdminProductEditor } from '@/components/admin-product-editor'
import { MenuPhotoThumb } from '@/components/menu-photo-field'
import { NoticeBar, type Notice } from '@/components/admin-notice'
import { useAdmin } from '@/components/admin-shell'
import { AdminPageHeader } from '@/components/admin-page-header'
import { AdminActionMenu } from '@/components/admin-action-menu'
import { adminPost, SignedOutError } from '@/lib/admin-api'

interface Product {
  id: string
  name: string
  description: string
  price: string
  priceId: string
  image?: string
  category?: string
  active: boolean
}

export function AdminMenu() {
  const { signedOut } = useAdmin()
  const [products, setProducts] = useState<Product[]>([])
  const [menuLoading, setMenuLoading] = useState(false)
  const [menuNotice, setMenuNotice] = useState<Notice>(null)
  const [menuQuery, setMenuQuery] = useState('')
  const [menuFilter, setMenuFilter] = useState<'all' | 'visible' | 'hidden'>('all')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    setMenuLoading(true)
    try {
      const data = await adminPost('/api/admin/menu', { action: 'list' })
      setProducts(data.products || [])
      setMenuNotice(null)
    } catch (error) {
      if (error instanceof SignedOutError) return signedOut()
      setMenuNotice({ type: 'error', text: error instanceof Error ? error.message : 'Could not load the menu.' })
    } finally {
      setMenuLoading(false)
    }
  }, [signedOut])
  useEffect(() => {
    void fetchProducts()
  }, [fetchProducts])

  const toggleProduct = async (product: Product) => {
    setTogglingId(product.id)
    try {
      await adminPost('/api/admin/menu', { action: 'toggle', productId: product.id, active: !product.active })
      setProducts(current =>
        current.map(item => (item.id === product.id ? { ...item, active: !product.active } : item)),
      )
      setMenuNotice({
        type: 'success',
        text: `${product.name} is now ${product.active ? 'hidden from' : 'shown on'} the menu.`,
      })
    } catch (error) {
      if (error instanceof SignedOutError) return signedOut()
      setMenuNotice({ type: 'error', text: `Could not update ${product.name}. Please try again.` })
    } finally {
      setTogglingId(null)
    }
  }

  const query = menuQuery.trim().toLocaleLowerCase()
  const shownProducts = products.filter(
    product =>
      (menuFilter === 'all' || (menuFilter === 'visible') === product.active) &&
      (!query || (product.name + ' ' + (product.category || '')).toLocaleLowerCase().includes(query)),
  )

  return (
    <section aria-labelledby="menu-admin-heading" className="space-y-4">
      <AdminPageHeader
        title="Menu"
        onRefresh={() => void fetchProducts()}
        busy={menuLoading}
        menu={[{ label: 'Add menu item', onSelect: () => setAdding(true) }]}
      />
      <AdminProductCreate onSaved={fetchProducts} open={adding} onOpenChange={setAdding} />
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <label htmlFor="admin-menu-search" className="sr-only">
            Find a menu item
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-muted-foreground"
          />
          <Input
            id="admin-menu-search"
            type="search"
            enterKeyHint="search"
            placeholder="Find an item…"
            value={menuQuery}
            onChange={e => setMenuQuery(e.target.value)}
            className="pl-11"
          />
        </div>
        <AdminSegmented
          label="Show items"
          value={menuFilter}
          onChange={setMenuFilter}
          options={[
            { id: 'all', label: 'All', count: products.length },
            { id: 'visible', label: 'Visible', count: products.filter(p => p.active).length },
            { id: 'hidden', label: 'Hidden', count: products.filter(p => !p.active).length },
          ]}
        />
      </div>
      <NoticeBar notice={menuNotice} />
      {menuLoading && !products.length ? (
        <div role="status">
          <span className="sr-only">Loading menu…</span>
          <ul className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="space-y-3 rounded-xl border bg-white p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-10 w-full" />
              </li>
            ))}
          </ul>
        </div>
      ) : shownProducts.length === 0 ? (
        <p className="rounded-xl border bg-white p-6 text-center text-muted-foreground">
          {products.length ? 'No items match.' : 'No menu items yet.'}
        </p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {shownProducts.map(product => (
            <li key={product.id} className="space-y-1.5 rounded-xl border bg-white p-3 text-sm">
              <div className="flex items-start gap-3">
                <MenuPhotoThumb url={product.image} />
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold tabular-nums text-primary">${product.price}</span>
                    {product.category && <> · {product.category}</>}
                    {' · '}
                    <span className={product.active ? 'text-green-800' : 'font-semibold'}>
                      {togglingId === product.id ? 'Saving…' : product.active ? 'Visible' : 'Hidden'}
                    </span>
                  </p>
                </div>
                <AdminActionMenu
                  label={'More actions for ' + product.name}
                  items={[
                    { label: 'Edit item', onSelect: () => setEditingId(product.id) },
                    {
                      label: product.active ? 'Hide from menu' : 'Show on menu',
                      onSelect: () => void toggleProduct(product),
                    },
                  ]}
                />
              </div>
              {product.description && (
                <p className="line-clamp-2 break-words text-muted-foreground">{product.description}</p>
              )}
              <AdminProductEditor
                product={product}
                open={editingId === product.id}
                onOpenChange={next => setEditingId(next ? product.id : null)}
                onSaved={updated => {
                  setProducts(current => current.map(item => (item.id === updated.id ? { ...item, ...updated } : item)))
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
