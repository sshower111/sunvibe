'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { canOptimizeGalleryImage, galleryAlt } from '@/lib/gallery-images'

function MarqueePhoto({ src, copy }: { src: string; copy: boolean }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <li
      className="box-content w-[clamp(17rem,40vw,32rem)] shrink-0 pr-[clamp(1rem,2vw,1.5rem)]"
      aria-hidden={copy || undefined}
    >
      <Link
        href={'/gallery?photo=' + encodeURIComponent(src)}
        tabIndex={copy ? -1 : undefined}
        aria-label={copy ? undefined : 'Open in the gallery: ' + galleryAlt(src)}
        className="group relative block aspect-square overflow-hidden rounded-lg border-2 border-gold/70 bg-surface"
      >
        <Image
          src={src}
          alt=""
          fill
          sizes="(min-width: 1280px) 32rem, (min-width: 768px) 40vw, 85vw"
          unoptimized={!canOptimizeGalleryImage(src)}
          onError={() => setFailed(true)}
          className="object-cover transition-transform duration-300 ease-[var(--ease-standard)] group-hover:scale-[1.04]"
        />
      </Link>
    </li>
  )
}

// A slow, endless strip of gallery photos. The set is drawn twice so the loop has no seam; the copy
// is hidden from screen readers and the keyboard. It stops on hover and keyboard focus, and visitors
// who ask for reduced motion get a still strip they can swipe instead. Each visit starts the loop at
// a random point (a negative animation delay), set after load so the server and browser HTML match.
export function BakeryMarquee({ images }: { images: string[] }) {
  const trackRef = useRef<HTMLUListElement>(null)
  const duration = images.length * 10
  useEffect(() => {
    if (trackRef.current) trackRef.current.style.animationDelay = `-${(Math.random() * duration).toFixed(2)}s`
  }, [duration])
  if (!images.length) return null
  return (
    <div
      className="bakery-marquee overflow-hidden motion-reduce:overflow-x-auto"
      style={{ '--marquee-duration': `${duration}s` } as React.CSSProperties}
    >
      {/* Spacing sits inside each photo (right padding) so half the strip is exactly one set: a seamless loop. */}
      <ul ref={trackRef} className="bakery-marquee-track flex w-max pb-2 pl-[var(--gutter)] motion-safe:pl-0">
        {images.map(src => (
          <MarqueePhoto key={src} src={src} copy={false} />
        ))}
        {images.map(src => (
          <MarqueePhoto key={src + '-copy'} src={src} copy />
        ))}
      </ul>
    </div>
  )
}
