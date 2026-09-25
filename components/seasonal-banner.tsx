"use client"

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { SeasonalBannerConfig } from '@/lib/seasonal'

const DISMISSAL_DURATION_MS = 24 * 60 * 60 * 1000

export function SeasonalBanner({ banner }: { banner: SeasonalBannerConfig | null }) {
  const [dismissedId, setDismissedId] = useState<string | null>(null)
  useEffect(() => {
    if (!banner) return
    try {
      const key = 'seasonal-banner:' + banner.id
      const expiresAt = Number(localStorage.getItem(key))
      const hidden = Number.isFinite(expiresAt) && expiresAt > Date.now()
      setDismissedId(hidden ? banner.id : null)
      // Expired timestamps and legacy permanent dismissals no longer hide banners.
      if (!hidden) localStorage.removeItem(key)
    } catch { /* Storage can be blocked; dismissal still works for this visit. */ }
  }, [banner?.id])

  if (!banner || dismissedId === banner.id) return null
  function dismiss() {
    if (!banner) return
    setDismissedId(banner.id)
    try { localStorage.setItem('seasonal-banner:' + banner.id, String(Date.now() + DISMISSAL_DURATION_MS)) } catch { /* Optional persistence. */ }
  }
  return (
    <div role="region" aria-label="Seasonal bakery announcement" className="border-b border-accent bg-secondary text-foreground">
      <div className="site-container relative flex flex-col gap-1 py-3 pr-16 lg:flex-row lg:items-center lg:gap-6">
        <div className="min-w-0 flex-1">
          <p className="font-serif text-base font-semibold text-primary">{banner.headline}</p>
          <p className="text-sm">{banner.message}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5">
          <a href={banner.ctaHref} className="inline-flex min-h-12 items-center rounded text-sm font-semibold text-primary underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-primary">{banner.ctaLabel}</a>
          {banner.productId && <a href={'/menu#' + encodeURIComponent(banner.productId)} className="inline-flex min-h-12 items-center rounded text-sm font-semibold text-primary underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-primary">See the gift box</a>}
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss seasonal announcement" className="absolute right-2 top-2 flex h-12 w-12 items-center justify-center rounded text-primary transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary"><X className="h-5 w-5" aria-hidden="true" /></button>
      </div>
    </div>
  )
}
