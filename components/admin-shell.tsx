'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Cake,
  Camera,
  CalendarHeart,
  ClipboardList,
  Ellipsis,
  ExternalLink,
  Images,
  Inbox,
  LogOut,
  RefreshCw,
  Settings,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ADMIN_SECTIONS, adminPath, bottomTabOf, sectionOf, type AdminSection } from '@/lib/admin-nav'

const ICONS: Record<AdminSection, LucideIcon> = {
  orders: Cake,
  inquiries: Inbox,
  menu: UtensilsCrossed,
  gallery: Images,
  photos: Camera,
  occasions: CalendarHeart,
  'pre-orders': ClipboardList,
  settings: Settings,
  more: Ellipsis,
}
const BOTTOM_TABS: { id: AdminSection; label: string }[] = [
  { id: 'orders', label: 'Orders' },
  { id: 'inquiries', label: 'Inquiries' },
  { id: 'menu', label: 'Menu' },
  { id: 'more', label: 'More' },
]
// Sidebar row (desktop). The open section gets a grey fill and a red bar on the left, like GitHub.
const sideItem = (active: boolean) =>
  `relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary ${
    active
      ? 'bg-secondary font-semibold text-foreground before:absolute before:-left-2 before:inset-y-1.5 before:w-1 before:rounded-full before:bg-primary'
      : 'text-muted-foreground hover:text-foreground'
  }`

/** Opened from the Home Screen icon rather than in a browser tab. */
const isHomeScreenApp = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const AdminContext = createContext<{ signOut: () => void; signedOut: () => void }>({
  signOut: () => {},
  signedOut: () => {},
})
/** signOut: the Sign out button. signedOut: an admin request came back 401, so show the sign-in form. */
export const useAdmin = () => useContext(AdminContext)

// Phones: pull down at the top of a page to reload it, like a native app.
const PULL_TRIGGER = 64
function usePullToRefresh(onRefresh: () => void) {
  const [pull, setPull] = useState(0)
  const refresh = useRef(onRefresh)
  refresh.current = onRefresh
  useEffect(() => {
    let startY: number | null = null
    let distance = 0
    const start = (e: TouchEvent) => {
      const target = e.target as Element
      if (window.scrollY > 0 || e.touches.length !== 1 || target.closest('[role="dialog"],input,textarea,select'))
        return
      startY = e.touches[0].clientY
    }
    const move = (e: TouchEvent) => {
      if (startY === null) return
      if (window.scrollY > 0) {
        startY = null
        setPull(0)
        return
      }
      distance = Math.max(0, (e.touches[0].clientY - startY) * 0.5)
      setPull(Math.min(distance, PULL_TRIGGER * 1.4))
    }
    const end = () => {
      if (startY !== null && distance >= PULL_TRIGGER) refresh.current()
      startY = null
      distance = 0
      setPull(0)
    }
    window.addEventListener('touchstart', start, { passive: true })
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', end)
    window.addEventListener('touchcancel', end)
    return () => {
      window.removeEventListener('touchstart', start)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
      window.removeEventListener('touchcancel', end)
    }
  }, [])
  return pull
}

// Admin auth uses an httpOnly session cookie set by /api/admin/verify.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const section = sectionOf(pathname)
  const [session, setSession] = useState<'checking' | 'signed-out' | 'signed-in'>('checking')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [pageKey, setPageKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    // Clean up the old insecure storage of the admin password.
    try {
      localStorage.removeItem('sunville-admin-password')
      localStorage.removeItem('sunville-admin-auth')
    } catch {
      /* storage blocked */
    }
    navigator.serviceWorker?.register('/admin/sw.js', { scope: '/admin' }).catch(() => {})
    fetch('/api/admin/verify', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setSession(d.authenticated ? 'signed-in' : 'signed-out'))
      .catch(() => setSession('signed-out'))
  }, [])

  const signedOut = useCallback(() => {
    setSession('signed-out')
    setLoginError('Your session ended. Please sign in again.')
  }, [])
  const signOut = useCallback(async () => {
    await fetch('/api/admin/verify', { method: 'DELETE' }).catch(() => {})
    setSession('signed-out')
    setLoginError('')
  }, [])

  // Reloads the open page's data by remounting it.
  const pull = usePullToRefresh(() => {
    setPageKey(k => k + 1)
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 700)
  })

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoggingIn(true)
    setLoginError('')
    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, device: isHomeScreenApp() }),
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
        </form>
      </main>
    )
  }

  const bottomTab = bottomTabOf(section)
  const sideLink = (id: Exclude<AdminSection, 'more'>, label: string) => {
    const Icon = ICONS[id]
    return (
      <Link
        key={id}
        href={adminPath(id)}
        className={sideItem(section === id)}
        aria-current={section === id ? 'page' : undefined}
      >
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        {label}
      </Link>
    )
  }

  return (
    <AdminContext.Provider value={{ signOut, signedOut }}>
      <div className="min-h-dvh bg-gray-50 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Desktop: sidebar. */}
        <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-white px-3 py-5 lg:flex">
          <h1 className="px-3 pb-5 font-serif text-xl font-semibold text-primary">Sunville admin</h1>
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Manage</p>
          <nav aria-label="Admin sections" className="space-y-0.5">
            {ADMIN_SECTIONS.filter(s => s.id !== 'settings').map(s => sideLink(s.id, s.label))}
          </nav>
          <div className="mt-auto space-y-0.5 border-t pt-3">
            {sideLink('settings', 'Settings')}
            <a href="/" target="_blank" rel="noopener noreferrer" className={sideItem(false)}>
              <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
              View website
            </a>
            <button type="button" onClick={signOut} className={sideItem(false)}>
              <LogOut aria-hidden="true" className="size-4 shrink-0" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          {/* Phones and tablets: slim top bar; the sections are in the bottom tab bar. */}
          <header className="sticky top-0 z-40 border-b bg-white pt-[env(safe-area-inset-top)] lg:hidden">
            <p className="py-2.5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] text-center font-serif text-lg font-semibold text-primary">
              Sunville admin
            </p>
          </header>

          {/* Pull-to-refresh indicator (phones). */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 z-30 flex justify-center lg:hidden"
            style={{
              top: 'calc(env(safe-area-inset-top) + 3.25rem)',
              opacity: refreshing ? 1 : Math.min(pull / PULL_TRIGGER, 1),
              transform: `translateY(${refreshing ? 12 : pull / 2}px)`,
            }}
          >
            <span className="rounded-full border bg-white p-2 shadow-sm">
              <RefreshCw
                className={'size-5 text-primary ' + (refreshing ? 'animate-spin' : '')}
                style={refreshing ? undefined : { transform: `rotate(${pull * 4}deg)` }}
              />
            </span>
          </div>
          <p role="status" className="sr-only">
            {refreshing ? 'Refreshing' : ''}
          </p>

          <main
            key={pageKey}
            className="mx-auto max-w-6xl space-y-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-5 sm:pl-[max(2rem,env(safe-area-inset-left))] sm:pr-[max(2rem,env(safe-area-inset-right))] sm:pt-8 lg:py-10"
          >
            {children}
          </main>

          {/* Phones and tablets: bottom tab bar. */}
          <nav
            aria-label="Admin sections"
            className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
          >
            {BOTTOM_TABS.map(tab => {
              const Icon = ICONS[tab.id]
              const active = bottomTab === tab.id
              return (
                <Link
                  key={tab.id}
                  href={adminPath(tab.id)}
                  aria-current={active ? 'page' : undefined}
                  className={
                    'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium ' +
                    (active ? 'text-primary' : 'text-muted-foreground')
                  }
                >
                  <Icon aria-hidden="true" className="size-6" strokeWidth={active ? 2.25 : 1.75} />
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </AdminContext.Provider>
  )
}
