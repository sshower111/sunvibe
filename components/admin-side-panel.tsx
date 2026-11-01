'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'

/**
 * The open order or inquiry, kept in the address (?open=<id>) so a refresh keeps it open and the phone's back
 * gesture closes it. Changing ?open= with history.pushState updates useSearchParams without reloading the list.
 */
export function useOpenParam() {
  const openId = useSearchParams().get('open')
  const pushed = useRef(false)
  const open = (id: string) => {
    const url = '?open=' + encodeURIComponent(id)
    if (openId) window.history.replaceState(null, '', url)
    else {
      window.history.pushState(null, '', url)
      pushed.current = true
    }
  }
  const close = () => {
    if (pushed.current) {
      pushed.current = false
      window.history.back()
    } else window.history.replaceState(null, '', window.location.pathname)
  }
  return { openId, open, close }
}

/**
 * Details panel that slides in from the right over the list (full screen on phones). Escape or the X closes it.
 * The list stays clickable beside it on wide screens, so another row can be opened straight away.
 */
export function AdminSidePanel({
  title,
  actions,
  onClose,
  children,
}: {
  title: React.ReactNode
  /** Shown before the close button, e.g. a refresh icon or a "⋯" menu. */
  actions?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !(e.target as Element).closest('[role="menu"]')) close.current()
    }
    document.addEventListener('keydown', onKey)
    // Phones: the panel covers the page, so the page underneath shouldn't scroll.
    const phone = window.matchMedia('(max-width: 1023px)').matches
    if (phone) document.documentElement.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      if (phone) document.documentElement.style.overflow = ''
      returnTo?.focus?.()
    }
  }, [])

  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby="admin-panel-title"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-white outline-none animate-in slide-in-from-right-8 fade-in-0 duration-200 lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[min(30rem,calc(100vw-16rem))] lg:border-l lg:shadow-[-8px_0_24px_rgb(31_35_40/0.08)]"
    >
      <header className="flex min-h-14 items-center gap-2 border-b pl-[max(1rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] lg:pt-0">
        <h2 id="admin-panel-title" className="heading-3 min-w-0 flex-1 truncate">
          {title}
        </h2>
        {actions}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-secondary active:bg-muted"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-[max(1rem,env(safe-area-inset-left))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 text-sm">
        {children}
      </div>
    </div>
  )
}

/** Label / value rows inside a panel. */
export function PanelDetails({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="divide-y rounded-lg border">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3 px-3 py-2">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 whitespace-pre-wrap break-words">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Shared look for the compact admin tables: one bordered box, a grey header, thin lines between rows. */
export const listBox = 'overflow-hidden rounded-lg border bg-white'
export const headCell = 'px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap'
export const rowClass = (selected: boolean) =>
  'cursor-pointer border-b last:border-0 transition-colors ' +
  (selected ? 'bg-blue-50/70' : 'hover:bg-secondary active:bg-muted')
