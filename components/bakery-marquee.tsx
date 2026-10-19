'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import type React from 'react'
import { Pause, Play } from 'lucide-react'
import { canOptimizeGalleryImage } from '@/lib/gallery-images'
import { splitName } from '@/lib/bilingual'

export type MarqueeItem = { id: string; name: string; image: string }

function MarqueeCard({ item, copy }: { item: MarqueeItem; copy: boolean }) {
  const [failed, setFailed] = useState(false)
  const { en, zh } = splitName(item.name)
  if (failed) return null
  return (
    <li
      className="w-[clamp(13rem,26vw,20rem)] shrink-0 box-content pr-[clamp(1rem,2vw,1.5rem)]"
      aria-hidden={copy || undefined}
    >
      <Link href={'/menu#' + item.id} tabIndex={copy ? -1 : undefined} className="group block rounded-lg">
        <span className="relative block aspect-square overflow-hidden rounded-lg border-2 border-gold/70 bg-surface">
          <Image
            src={item.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 20rem, 60vw"
            unoptimized={!canOptimizeGalleryImage(item.image)}
            onError={() => setFailed(true)}
            className="object-cover transition-transform duration-300 ease-[var(--ease-standard)] group-hover:scale-[1.04]"
          />
        </span>
        {zh && (
          <span lang="zh-Hant" className="han-label mt-3 block text-[clamp(1.25rem,1rem+0.8vw,1.625rem)]">
            {zh}
          </span>
        )}
        <span className="mt-0.5 block text-sm font-medium text-ink group-hover:underline group-hover:underline-offset-4">
          {en}
        </span>
      </Link>
    </li>
  )
}

// A slow, endless strip of menu photos, like the bakery case going by. Each set is drawn twice so
// the loop has no seam; the copy is hidden from screen readers and the keyboard. It stops on hover,
// on keyboard focus, with the Pause button, and for visitors who ask for reduced motion (who can
// swipe or scroll it instead).
export function BakeryMarquee({ items }: { items: MarqueeItem[] }) {
  const [paused, setPaused] = useState(false)
  if (!items.length) return null
  return (
    <div className="relative">
      <div
        className="bakery-marquee overflow-hidden motion-reduce:overflow-x-auto motion-reduce:[scrollbar-width:thin]"
        data-paused={paused || undefined}
        style={{ '--marquee-duration': `${items.length * 10}s` } as React.CSSProperties}
      >
        {/* Spacing sits inside each card (right padding) so half the strip is exactly one set: a seamless loop. */}
        <ul className="bakery-marquee-track flex w-max pb-2 pl-[var(--gutter)] motion-safe:pl-0">
          {items.map(item => (
            <MarqueeCard key={item.id} item={item} copy={false} />
          ))}
          {items.map(item => (
            <MarqueeCard key={item.id + '-copy'} item={item} copy />
          ))}
        </ul>
      </div>
      <div className="site-container mt-4 flex justify-end motion-reduce:hidden">
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          aria-pressed={paused}
          className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-ink-muted hover:bg-secondary hover:text-ink"
        >
          {paused ? <Play aria-hidden="true" className="size-4" /> : <Pause aria-hidden="true" className="size-4" />}
          {paused ? 'Play photos' : 'Pause photos'}
        </button>
      </div>
    </div>
  )
}
