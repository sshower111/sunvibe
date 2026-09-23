"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"

const links = [{ href: '/', label: 'Home' }, { href: '/#about', label: 'About' }, { href: '/menu', label: 'Menu' }, { href: '/gallery', label: 'Gallery' }, { href: '/contact', label: 'Contact' }]

export function Navigation() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const toggle = useRef<HTMLButtonElement>(null)
  const header = useRef<HTMLElement>(null)
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => { if (!header.current?.contains(event.target as Node)) setOpen(false) }
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus() } }
    const media = window.matchMedia('(min-width: 768px)')
    const resize = () => { if (media.matches) setOpen(false) }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    media.addEventListener('change', resize)
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeEscape); media.removeEventListener('change', resize) }
  }, [open])
  return <header ref={header} className="fixed inset-x-0 top-0 z-50 border-b border-border bg-white shadow-sm" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
      <div className="flex h-16 items-center justify-between gap-4 md:h-24">
        <Link href="/" aria-label="Sunville Bakery home" onClick={() => setOpen(false)} className="flex min-h-11 min-w-0 items-center rounded focus-visible:outline-2 focus-visible:outline-primary"><img src="/logoBlack.png" alt="Sunville Bakery" className="h-9 w-auto max-w-[180px] object-contain md:h-12" /></Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-5 md:flex lg:gap-8">
          {links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined} className={'inline-flex min-h-11 items-center rounded text-sm font-medium underline-offset-8 hover:underline focus-visible:outline-2 focus-visible:outline-primary ' + (pathname === link.href ? 'text-primary underline' : 'text-foreground')}>{link.label}</Link>)}
        </nav>
        <button ref={toggle} type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(!open)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary md:hidden">{open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
      </div>
      <nav id="mobile-navigation" aria-label="Mobile navigation" hidden={!open} className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t py-3 md:hidden">
        {links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} aria-current={pathname === link.href ? 'page' : undefined} className={'flex min-h-12 items-center rounded-lg px-3 text-base font-medium focus-visible:outline-2 focus-visible:outline-primary ' + (pathname === link.href ? 'bg-secondary text-primary' : 'text-foreground hover:bg-secondary')}>{link.label}</Link>)}
      </nav>
    </div>
  </header>
}
