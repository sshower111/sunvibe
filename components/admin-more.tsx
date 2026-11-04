'use client'

import Link from 'next/link'
import {
  CalendarHeart,
  Camera,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Images,
  LogOut,
  Settings,
} from 'lucide-react'
import { useAdmin } from '@/components/admin-shell'
import { adminPath } from '@/lib/admin-nav'

const row =
  'flex min-h-12 w-full items-center gap-3 px-4 text-left text-[1.0625rem] text-foreground transition-colors active:bg-[var(--admin-fill)]'
const list = 'divide-y overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)]'
const tile = 'flex size-8 shrink-0 items-center justify-center rounded-lg'

export function AdminMore() {
  const { signOut } = useAdmin()
  return (
    <section aria-labelledby="more-heading" className="space-y-4">
      <h2 id="more-heading" className="heading-2">
        More
      </h2>
      <ul className={list}>
        {(
          [
            ['gallery', 'Gallery', Images],
            ['photos', 'Customer photos', Camera],
            ['occasions', 'Occasions', CalendarHeart],
            ['pre-orders', 'Pre-orders', ClipboardList],
            ['settings', 'Settings', Settings],
          ] as const
        ).map(([id, label, Icon]) => (
          <li key={id}>
            <Link href={adminPath(id)} className={row}>
              <span className={tile + ' bg-primary text-white'}>
                <Icon aria-hidden="true" className="size-[1.125rem]" />
              </span>
              <span className="flex-1">{label}</span>
              <ChevronRight aria-hidden="true" className="size-5 text-[rgb(60_60_67/0.3)]" />
            </Link>
          </li>
        ))}
      </ul>
      <ul className={list}>
        <li>
          <a href="/" target="_blank" rel="noopener noreferrer" className={row}>
            <span className={tile + ' bg-[var(--admin-fill)] text-foreground'}>
              <ExternalLink aria-hidden="true" className="size-[1.125rem]" />
            </span>
            <span className="flex-1">View website</span>
          </a>
        </li>
        <li>
          <button type="button" onClick={signOut} className={row.replace('text-foreground', 'text-danger')}>
            <span className={tile + ' bg-red-100/70'}>
              <LogOut aria-hidden="true" className="size-[1.125rem]" />
            </span>
            <span className="flex-1">Sign out</span>
          </button>
        </li>
      </ul>
    </section>
  )
}
