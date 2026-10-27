'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, MapPin, Menu, Phone, X } from 'lucide-react'
import { useSite } from '@/components/site-context'
import { SITE } from '@/lib/site-info'

const baseLinks = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/order-cake', label: 'Order a Cake' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact' },
]

export function Navigation({ sticky = true }: { sticky?: boolean }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  // "Pre-order" only appears while a festival campaign is active, so it stays reachable after the banner is dismissed.
  const { preorderOpen } = useSite()
  const links = preorderOpen
    ? [...baseLinks.slice(0, 4), { href: '/pre-order', label: 'Pre-order' }, ...baseLinks.slice(4)]
    : baseLinks
  const pathname = usePathname()
  const toggle = useRef<HTMLButtonElement>(null)
  const header = useRef<HTMLElement>(null)
  useEffect(() => {
    setOpen(false)
  }, [pathname])
  // A soft shadow appears once the page scrolls under the header.
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 4)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  // The open phone menu covers the page, so the page behind it should not scroll.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])
  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        toggle.current?.focus()
      }
    }
    const media = window.matchMedia('(min-width: 768px)')
    const resize = () => {
      if (media.matches) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    media.addEventListener('change', resize)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeEscape)
      media.removeEventListener('change', resize)
    }
  }, [open])
  return (
    <>
      <header
        ref={header}
        className={
          (sticky ? 'sticky -mb-[var(--header-height)]' : 'fixed inset-x-0') +
          ' top-0 z-50 border-b bg-card transition-shadow duration-200 ' +
          (scrolled || open ? 'shadow-pop' : '')
        }
        onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
        }}
      >
        <div className="site-container">
          <div className="flex h-[var(--header-height)] items-center justify-between gap-4">
            <Link
              href="/"
              aria-label="Sunville Bakery home"
              onClick={() => setOpen(false)}
              className="flex h-12 w-[180px] shrink-0 items-center rounded-sm"
            >
              <img
                src="/logo-dark.png"
                width={600}
                height={204}
                alt="Sunville Bakery"
                className="h-9 w-full object-contain object-left md:h-12"
              />
            </Link>
            <nav aria-label="Main navigation" className="ml-auto hidden items-center gap-1 lg:flex lg:gap-2">
              {/* The logo already links home; drop "Home" on desktop when Pre-order needs the room. */}
              {links
                .filter(link => !(preorderOpen && link.href === '/'))
                .map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={pathname === link.href ? 'page' : undefined}
                    className={
                      'inline-flex min-h-12 min-w-11 items-center justify-center whitespace-nowrap rounded-sm px-2 text-[0.9375rem] font-medium decoration-[3px] underline-offset-[10px] transition-colors hover:text-brand ' +
                      (pathname === link.href ? 'text-primary underline' : 'text-foreground')
                    }
                  >
                    {link.label}
                  </Link>
                ))}
            </nav>
            {/* Calling is how most orders start, so it stays in view on wide screens. */}
            <a
              href={SITE.phoneHref}
              className="action-button hidden shrink-0 items-center gap-2 bg-brand text-white hover:bg-brand-deep active:bg-brand-deep xl:inline-flex"
            >
              <Phone aria-hidden="true" className="size-4" />
              {SITE.phone}
            </a>
            <button
              ref={toggle}
              type="button"
              aria-expanded={open}
              aria-controls="mobile-navigation"
              aria-label={open ? 'Close navigation' : 'Open navigation'}
              onClick={() => setOpen(!open)}
              className="-mr-2 ml-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-primary transition-colors hover:bg-secondary active:bg-muted lg:hidden"
            >
              {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            hidden={!open}
            className="max-h-[calc(100dvh-var(--header-height))] overflow-y-auto border-t pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 animate-in fade-in slide-in-from-top-2 duration-200 lg:hidden"
          >
            <ul className="divide-y">
              {links.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={pathname === link.href ? 'page' : undefined}
                    className={
                      'flex min-h-14 items-center justify-between gap-3 rounded-sm px-1 font-serif text-xl transition-colors ' +
                      (pathname === link.href ? 'text-primary' : 'text-foreground active:bg-secondary')
                    }
                  >
                    <span className="flex items-center gap-3">
                      {pathname === link.href && (
                        <span aria-hidden="true" className="h-5 w-1 rounded-full bg-primary" />
                      )}
                      {link.label}
                    </span>
                    <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
            {/* Most phone visitors want to call or find the shop, so both are one tap away. */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={SITE.phoneHref}
                className="action-button inline-flex items-center justify-center gap-2 bg-brand text-white hover:bg-brand-deep active:bg-brand-deep"
              >
                <Phone aria-hidden="true" className="size-4" />
                Call
              </a>
              <a
                href={SITE.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="action-button inline-flex items-center justify-center gap-2 border border-input bg-card text-foreground hover:bg-secondary active:bg-muted"
              >
                <MapPin aria-hidden="true" className="size-4" />
                Directions<span className="sr-only"> (opens a new tab)</span>
              </a>
            </div>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              {SITE.hours.dailyDays} {SITE.hours.daily}, Wednesday {SITE.hours.wednesday}
            </p>
          </nav>
        </div>
      </header>
      {/* Dims the page behind the open phone menu; tapping it closes the menu (via the outside-click handler above). */}
      {open && (
        <div
          aria-hidden="true"
          className="fixed inset-x-0 bottom-0 top-0 z-[45] bg-ink/30 animate-in fade-in duration-200 lg:hidden"
        />
      )}
    </>
  )
}
