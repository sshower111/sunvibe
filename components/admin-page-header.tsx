'use client'

import { RefreshCw } from 'lucide-react'
import { AdminActionMenu, type MenuItem } from '@/components/admin-action-menu'

/** Section title with a refresh icon and, optionally, a "⋯" menu for less-used actions (e.g. test orders). */
export function AdminPageHeader({
  title,
  onRefresh,
  busy,
  menu,
}: {
  title: string
  onRefresh: () => void
  busy: boolean
  menu?: MenuItem[]
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="heading-2">{title}</h2>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Refresh ${title.toLowerCase()}`}
          onClick={onRefresh}
          disabled={busy}
          className="inline-flex size-10 items-center justify-center rounded-md border bg-card text-foreground hover:bg-secondary disabled:opacity-60"
        >
          <RefreshCw aria-hidden="true" className={'size-5 ' + (busy ? 'animate-spin' : '')} />
        </button>
        {menu?.length ? <AdminActionMenu label={`More ${title.toLowerCase()} actions`} items={menu} /> : null}
      </div>
    </div>
  )
}
