'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Ellipsis } from 'lucide-react'

export type MenuItem = {
  label: string
  /** Runs the action; or give `href` for a link (tel:, mailto:, sms:). */
  onSelect?: () => void
  href?: string
  danger?: boolean
  /** Only shown on phones (e.g. "Text kitchen", which opens Messages). */
  phoneOnly?: boolean
}

const MENU_WIDTH = 224

/**
 * "⋯" button that opens a short list of less-used actions. Keyboard and VoiceOver friendly: arrow keys move
 * between items, Escape or Tab closes it and focus returns to the button. The list is positioned on screen
 * (fixed, in a portal), so a scrolling table or the sliding side panel can't clip or shift it, and opens upwards
 * when there is no room below.
 */
export function AdminActionMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top?: number; bottom?: number; left: number } | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const id = useId()

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) button.current?.focus()
  }

  useLayoutEffect(() => {
    if (!open || !button.current) return
    const rect = button.current.getBoundingClientRect()
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8))
    const roomBelow = window.innerHeight - rect.bottom
    setPosition(
      roomBelow < 48 * items.length + 16
        ? { bottom: window.innerHeight - rect.top + 4, left }
        : { top: rect.bottom + 4, left },
    )
  }, [open, items.length])

  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const outside = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) close(false)
    }
    const away = () => close(false)
    document.addEventListener('pointerdown', outside)
    window.addEventListener('scroll', away, true)
    window.addEventListener('resize', away)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('scroll', away, true)
      window.removeEventListener('resize', away)
    }
  }, [open, position])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const all = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])].filter(
      el => el.offsetParent !== null,
    )
    const at = all.indexOf(document.activeElement as HTMLElement)
    const go = (i: number) => {
      e.preventDefault()
      all[(i + all.length) % all.length]?.focus()
    }
    if (e.key === 'ArrowDown') go(at + 1)
    else if (e.key === 'ArrowUp') go(at - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(all.length - 1)
    else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Tab') close(false)
  }

  const itemClass = (item: MenuItem) =>
    'flex min-h-11 w-full items-center px-4 text-left text-[0.9375rem] outline-none hover:bg-[var(--admin-fill)] focus-visible:bg-[var(--admin-fill)] active:bg-[var(--admin-fill-strong)] ' +
    (item.danger ? 'text-danger ' : '') +
    (item.phoneOnly ? 'sm:hidden' : '')

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(o => !o)}
        className="admin-pressable inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--admin-fill)] text-primary hover:bg-[var(--admin-fill-strong)]"
      >
        <Ellipsis aria-hidden="true" className="size-5" />
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={menu}
            id={id}
            role="menu"
            aria-label={label}
            onKeyDown={onKeyDown}
            style={{ ...position, width: MENU_WIDTH }}
            className="admin-material admin-pop-in fixed z-[60] divide-y overflow-hidden rounded-xl shadow-[0_10px_40px_rgb(0_0_0/0.18),0_0_0_0.5px_rgb(0_0_0/0.08)]"
          >
            {items.map(item =>
              item.href ? (
                <a
                  key={item.label}
                  role="menuitem"
                  tabIndex={-1}
                  href={item.href}
                  className={itemClass(item)}
                  onClick={() => {
                    item.onSelect?.()
                    close(false)
                  }}
                >
                  {item.label}
                </a>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={itemClass(item)}
                  onClick={() => {
                    close()
                    item.onSelect?.()
                  }}
                >
                  {item.label}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
