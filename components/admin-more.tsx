'use client'

import Link from 'next/link'
import { CalendarHeart, ChevronRight, ClipboardList, ExternalLink, Images, LogOut, Settings } from 'lucide-react'
import { useAdmin } from '@/components/admin-shell'
import { adminPath } from '@/lib/admin-nav'

const row = 'flex min-h-14 w-full items-center gap-3 px-4 text-left text-base active:bg-secondary'

export function AdminMore() {
  const { signOut } = useAdmin()
  return (
    <section aria-labelledby="more-heading" className="space-y-4">
      <h2 id="more-heading" className="heading-2">
        More
      </h2>
      <ul className="divide-y overflow-hidden rounded-xl border bg-white">
        {(
          [
            ['gallery', 'Gallery', Images],
            ['occasions', 'Occasions', CalendarHeart],
            ['pre-orders', 'Pre-orders', ClipboardList],
            ['settings', 'Settings', Settings],
          ] as const
        ).map(([id, label, Icon]) => (
          <li key={id}>
            <Link href={adminPath(id)} className={row}>
              <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
              <span className="flex-1">{label}</span>
              <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
      <ul className="divide-y overflow-hidden rounded-xl border bg-white">
        <li>
          <a href="/" target="_blank" rel="noopener noreferrer" className={row}>
            <ExternalLink aria-hidden="true" className="size-5 text-muted-foreground" />
            <span className="flex-1">View website</span>
          </a>
        </li>
        <li>
          <button type="button" onClick={signOut} className={row + ' text-danger'}>
            <LogOut aria-hidden="true" className="size-5" />
            <span className="flex-1">Sign out</span>
          </button>
        </li>
      </ul>
    </section>
  )
}
