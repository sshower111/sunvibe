import type React from 'react'
import { cn } from '@/lib/utils'

// Red signboard at the top of each public page, with the gold box-ribbon edge.
// It sits under the fixed header, so it pads itself by the header height.
export function PageBand({
  id,
  title,
  children,
  aside,
  className,
}: {
  id: string
  title: React.ReactNode
  children?: React.ReactNode
  aside?: React.ReactNode
  className?: string
}) {
  return (
    <section aria-labelledby={id} className={cn('signboard border-b-[6px] border-gold', className)}>
      <div className="site-container flex flex-col gap-6 pb-[clamp(1.5rem,5vw,3.5rem)] pt-[calc(var(--header-height)+clamp(1.5rem,5vw,3.5rem))] sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-3xl">
          <h1 id={id} className="heading-1">
            {title}
          </h1>
          {children && (
            <div className="mt-3 text-base leading-relaxed text-white/90 sm:mt-4 sm:text-lg">{children}</div>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </section>
  )
}
