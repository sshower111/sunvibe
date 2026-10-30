'use client'

import { useEffect, useState } from 'react'
import { getStoreStatus } from '@/lib/menu'
import { SITE } from '@/lib/site-info'
import { cn } from '@/lib/utils'

// Live "Open · Closes at 8 PM" line (Las Vegas time). The cached page shows the hours until the browser fills it in.
export function StoreStatus({ className, onLight = false }: { className?: string; onLight?: boolean }) {
  const [status, setStatus] = useState<ReturnType<typeof getStoreStatus> | null>(null)
  useEffect(() => {
    const update = () => setStatus(getStoreStatus(new Date()))
    update()
    const timer = setInterval(update, 60000)
    return () => clearInterval(timer)
  }, [])
  return (
    <p className={cn('flex items-center gap-2 text-sm font-medium', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'size-2.5 shrink-0 rounded-full',
          onLight
            ? status?.open
              ? 'bg-success'
              : 'bg-ink-muted'
            : status?.open
              ? 'bg-success-on-dark'
              : 'bg-white/50',
        )}
      />
      <span>{status ? status.text : `Open ${SITE.hours.daily} (Wed ${SITE.hours.wednesday})`}</span>
    </p>
  )
}
