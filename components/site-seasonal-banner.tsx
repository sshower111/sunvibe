"use client"

import { usePathname } from 'next/navigation'
import { SeasonalBanner } from '@/components/seasonal-banner'
import type { SeasonalBannerConfig } from '@/lib/seasonal'

export function SiteSeasonalBanner({ banner }: { banner: SeasonalBannerConfig | null }) {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) return null
  return <SeasonalBanner banner={banner} />
}
