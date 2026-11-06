'use client'

import { RefreshCw } from 'lucide-react'
import { AdminActionMenu, type MenuItem } from '@/components/admin-action-menu'

/**
 * Section title with a refresh icon and, optionally, a "⋯" menu for less-used actions (e.g. test orders) and a main
 * action button (e.g. New custom order).
 */
export function AdminPageHeader({
  title,
  onRefresh,
  busy,
  menu,
  action,
}: {
  title: string
  onRefresh: () => void
  busy: boolean
  menu?: MenuItem[]
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-3 pt-1">
      <h2 className="heading-2">{title}</h2>
      <div className="flex items-center gap-2">
        {action}
        <button
          type="button"
          aria-label={`Refresh ${title.toLowerCase()}`}
          onClick={onRefresh}
          disabled={busy}
          className="admin-pressable inline-flex size-10 items-center justify-center rounded-full bg-[var(--admin-fill)] text-primary hover:bg-[var(--admin-fill-strong)] disabled:opacity-60"
        >
          <RefreshCw aria-hidden="true" className={'size-5 ' + (busy ? 'animate-spin' : '')} />
        </button>
        {menu?.length ? <AdminActionMenu label={`More ${title.toLowerCase()} actions`} items={menu} /> : null}
      </div>
    </div>
  )
}
