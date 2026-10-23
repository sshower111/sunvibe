'use client'

import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, LogOut, Search } from 'lucide-react'
import { GalleryPhotoUpload } from '@/components/gallery-photo-upload'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { adminPost, SignedOutError } from '@/lib/admin-api'
import { Input } from '@/components/ui/input'
import { AdminOccasions } from '@/components/admin-occasions'
import { AdminPreOrders } from '@/components/admin-pre-orders'
import { AdminCakeInquiries } from '@/components/admin-cake-inquiries'
import { AdminCakeOrders } from '@/components/admin-cake-orders'
import { AdminProductCreate } from '@/components/admin-product-create'
import { AdminProductEditor } from '@/components/admin-product-editor'
import { MenuPhotoThumb } from '@/components/menu-photo-field'

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

type Tab = 'menu' | 'gallery' | 'occasions' | 'pre-orders' | 'cake-orders' | 'cake-inquiries' | 'settings'
const TABS: { id: Tab; label: string }[] = [
  { id: 'menu', label: 'Menu' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'occasions', label: 'Occasions' },
  { id: 'pre-orders', label: 'Pre-orders' },
  { id: 'cake-orders', label: 'Cake orders' },
  { id: 'cake-inquiries', label: 'Cake inquiries' },
  { id: 'settings', label: 'Settings' },
]
type Notice = { type: 'success' | 'error'; text: string } | null

function NoticeBar({ notice }: { notice: Notice }) {
  if (!notice) return null
  return (
    <p
      role={notice.type === 'error' ? 'alert' : 'status'}
      className={
        'rounded-lg border p-3 text-sm ' +
        (notice.type === 'error'
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-green-200 bg-green-50 text-green-800')
      }
    >
      {notice.text}
    </p>
  )
}

// Admin auth uses an httpOnly session cookie set by /api/admin/verify.
export default function AdminPage() {
  const [session, setSession] = useState<'checking' | 'signed-out' | 'signed-in'>('checking')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('menu')
  // The open tab is kept in the address (/admin?tab=cake-orders), so emails, bookmarks and reloads open it.
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab')
    if (TABS.some(t => t.id === tab)) setActiveTab(tab as Tab)
  }, [])

  // Menu state
  const [products, setProducts] = useState<Product[]>([])
  const [menuLoading, setMenuLoading] = useState(false)
  const [menuNotice, setMenuNotice] = useState<Notice>(null)
  const [menuQuery, setMenuQuery] = useState('')
  const [menuFilter, setMenuFilter] = useState<'all' | 'visible' | 'hidden'>('all')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Gallery state
  const [images, setImages] = useState<string[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [galleryNotice, setGalleryNotice] = useState<Notice>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const [maintenanceMode, setMaintenanceMode] = useState<boolean | null>(null)

  useEffect(() => {
    // Clean up the old insecure storage of the admin password.
    try {
      localStorage.removeItem('sunville-admin-password')
      localStorage.removeItem('sunville-admin-auth')
    } catch {
      /* storage blocked */
    }
    fetch('/api/admin/verify', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setSession(d.authenticated ? 'signed-in' : 'signed-out'))
      .catch(() => setSession('signed-out'))
  }, [])

  const signedOut = useCallback(() => {
    setSession('signed-out')
    setLoginError('Your session ended. Please sign in again.')
  }, [])

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

  const fetchGalleryImages = useCallback(async () => {
    setGalleryLoading(true)
    try {
      const response = await fetch('/api/gallery', { cache: 'no-store' })
      const data = await response.json()
      setImages(data.images || [])
      if (data.degraded)
        setGalleryNotice({
          type: 'error',
          text: 'Gallery storage is unavailable, so the built-in photos are shown. Changes may not save until it recovers.',
        })
    } catch {
      setGalleryNotice({ type: 'error', text: 'Could not load the gallery. Check your connection and try again.' })
    } finally {
      setGalleryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session !== 'signed-in') return
    if (activeTab === 'menu' && !products.length) void fetchProducts()
    else if (activeTab === 'gallery' && !images.length) void fetchGalleryImages()
    else if (activeTab === 'settings' && maintenanceMode === null)
      fetch('/api/admin/maintenance')
        .then(r => r.json())
        .then(d => setMaintenanceMode(!!d.maintenanceMode))
        .catch(() => {})
  }, [session, activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoggingIn(true)
    setLoginError('')
    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Incorrect password.')
      setPassword('')
      setSession('signed-in')
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Sign in failed. Please try again.')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/verify', { method: 'DELETE' }).catch(() => {})
    setSession('signed-out')
    setProducts([])
    setImages([])
    setLoginError('')
  }

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

  const addImageFromUrl = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newImageUrl.trim()) return
    setUrlLoading(true)
    try {
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', url: newImageUrl.trim() }),
      })
      if (res.status === 401) return signedOut()
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to add image')
      setNewImageUrl('')
      await fetchGalleryImages()
      setGalleryNotice({ type: 'success', text: 'Photo link added to the gallery.' })
    } catch (err) {
      setGalleryNotice({ type: 'error', text: err instanceof Error ? err.message : 'Failed to add the link.' })
    } finally {
      setUrlLoading(false)
    }
  }

  const removeImage = async (url: string) => {
    setRemoving(url)
    setConfirmRemove(null)
    try {
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', url }),
      })
      if (res.status === 401) return signedOut()
      if (!res.ok) throw new Error()
      setImages(current => current.filter(image => image !== url))
      setGalleryNotice({ type: 'success', text: 'Photo removed from the gallery.' })
    } catch {
      setGalleryNotice({ type: 'error', text: 'Could not remove the photo. Please try again.' })
    } finally {
      setRemoving(null)
    }
  }

  if (session === 'checking')
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gray-50 p-4">
        <p role="status" className="text-muted-foreground">
          Loading admin…
        </p>
      </main>
    )

  if (session === 'signed-out') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gray-50 p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm space-y-4 rounded-xl border bg-white card-pad shadow-sm"
        >
          <h1 className="heading-2">Sunville admin</h1>
          <div className="space-y-2">
            <label htmlFor="admin-password" className="block text-sm font-medium">
              Password
            </label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loggingIn}
              autoFocus
            />
          </div>
          {loginError && (
            <p role="alert" className="text-sm text-red-700">
              {loginError}
            </p>
          )}
          <Button type="submit" className="w-full" loading={loggingIn}>
            {loggingIn ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="text-xs text-muted-foreground">You stay signed in on this device for 12 hours.</p>
        </form>
      </main>
    )
  }

  const query = menuQuery.trim().toLocaleLowerCase()
  const shownProducts = products.filter(
    product =>
      (menuFilter === 'all' || (menuFilter === 'visible') === product.active) &&
      (!query || (product.name + ' ' + (product.category || '')).toLocaleLowerCase().includes(query)),
  )

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <h1 className="font-serif text-lg font-semibold text-primary sm:text-2xl">Sunville admin</h1>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" aria-label="View website (opens a new tab)">
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
            <Button onClick={handleLogout} variant="ghost" size="icon" aria-label="Sign out">
              <LogOut aria-hidden="true" />
            </Button>
          </div>
        </div>
        {/* Tabs scroll sideways on phones instead of wrapping onto several lines. */}
        <nav
          aria-label="Admin sections"
          className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-2 sm:px-8 [scrollbar-width:none]"
        >
          {TABS.map(tab => (
            <Button
              key={tab.id}
              className="shrink-0"
              variant={activeTab === tab.id ? 'default' : 'outline'}
              aria-pressed={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                // Keep the tab in the address so a reload (or a bookmark) opens the same tab.
                window.history.replaceState(null, '', tab.id === 'menu' ? '/admin' : `/admin?tab=${tab.id}`)
              }}
            >
              {tab.label}
            </Button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-8 sm:py-8">
        {activeTab === 'occasions' && <AdminOccasions />}
        {activeTab === 'pre-orders' && <AdminPreOrders />}
        {activeTab === 'cake-orders' && <AdminCakeOrders />}
        {activeTab === 'cake-inquiries' && <AdminCakeInquiries />}

        {activeTab === 'menu' && (
          <section aria-labelledby="menu-admin-heading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="menu-admin-heading" className="heading-2">
                Menu <span className="text-base font-normal text-muted-foreground">({products.length} items)</span>
              </h2>
              <AdminProductCreate onSaved={fetchProducts} />
            </div>
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
              <div role="group" aria-label="Show items" className="flex gap-2">
                {(['all', 'visible', 'hidden'] as const).map(value => (
                  <Button
                    key={value}
                    variant={menuFilter === value ? 'default' : 'outline'}
                    aria-pressed={menuFilter === value}
                    className="flex-1 sm:flex-none"
                    onClick={() => setMenuFilter(value)}
                  >
                    {value[0].toUpperCase() + value.slice(1)}
                  </Button>
                ))}
              </div>
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
              <ul className="grid gap-3 md:grid-cols-2">
                {shownProducts.map(product => (
                  <li key={product.id} className="flex flex-col gap-3 rounded-xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <MenuPhotoThumb url={product.image} />
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold">{product.name}</p>
                        {product.category && <p className="text-xs text-muted-foreground">{product.category}</p>}
                      </div>
                      <p className="shrink-0 font-semibold tabular-nums text-primary">${product.price}</p>
                    </div>
                    <p className="line-clamp-2 break-words text-sm text-muted-foreground">
                      {product.description || 'No description'}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      <span
                        className={
                          'rounded px-2 py-1 text-xs font-medium ' +
                          (product.active ? 'bg-green-100 text-green-900' : 'bg-gray-100 text-gray-700')
                        }
                      >
                        {product.active ? 'Visible' : 'Hidden'}
                      </span>
                      <div className="ml-auto flex gap-2">
                        <AdminProductEditor
                          product={product}
                          onSaved={updated => {
                            setProducts(current =>
                              current.map(item => (item.id === updated.id ? { ...item, ...updated } : item)),
                            )
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={togglingId === product.id}
                          onClick={() => toggleProduct(product)}
                        >
                          {togglingId === product.id ? 'Saving…' : product.active ? 'Hide' : 'Show'}
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {activeTab === 'gallery' && (
          <section aria-labelledby="gallery-admin-heading" className="space-y-4">
            <h2 id="gallery-admin-heading" className="heading-2">
              Gallery <span className="text-base font-normal text-muted-foreground">({images.length} photos)</span>
            </h2>
            <div className="space-y-4 rounded-xl border bg-white p-4">
              <GalleryPhotoUpload
                onSaved={() => {
                  void fetchGalleryImages()
                }}
              />
              <details>
                <summary className="min-h-12 cursor-pointer py-3 text-sm focus-visible:outline focus-visible:outline-2">
                  Or add a photo link
                </summary>
                <form onSubmit={addImageFromUrl} className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="url"
                    inputMode="url"
                    aria-label="Photo URL"
                    placeholder="https://example.com/image.jpg"
                    value={newImageUrl}
                    onChange={e => setNewImageUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" loading={urlLoading} disabled={!newImageUrl.trim()}>
                    {urlLoading ? 'Adding…' : 'Add link'}
                  </Button>
                </form>
              </details>
            </div>
            <NoticeBar notice={galleryNotice} />
            {galleryLoading && !images.length ? (
              <div role="status">
                <span className="sr-only">Loading photos…</span>
                <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {Array.from({ length: 8 }, (_, i) => (
                    <li key={i}>
                      <Skeleton className="aspect-square w-full rounded-xl" />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {images.map(image => (
                  <li key={image} className="overflow-hidden rounded-xl border bg-white">
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="aspect-square w-full object-cover"
                    />
                    <div className="p-2">
                      {confirmRemove === image ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="sm" variant="destructive" onClick={() => removeImage(image)}>
                            Remove
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setConfirmRemove(null)}>
                            Keep
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled={removing === image}
                          onClick={() => setConfirmRemove(image)}
                        >
                          {removing === image ? 'Removing…' : 'Remove photo'}
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {activeTab === 'settings' && (
          <section aria-labelledby="settings-heading" className="space-y-4 rounded-xl border bg-white p-4 sm:p-6">
            <h2 id="settings-heading" className="heading-2">
              Settings
            </h2>
            <div>
              <h3 className="heading-3 mb-2">Maintenance mode</h3>
              <p className="mb-3">
                <span
                  className={
                    'rounded px-3 py-1 text-sm font-medium ' +
                    (maintenanceMode ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800')
                  }
                >
                  {maintenanceMode === null
                    ? 'Checking…'
                    : maintenanceMode
                      ? 'Maintenance mode is ON'
                      : 'Site is online'}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                When on, customers see a maintenance message. To change it, set <code>MAINTENANCE_MODE</code> to{' '}
                <code>true</code> or <code>false</code> in Vercel → Project → Settings → Environment Variables, then
                redeploy.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
