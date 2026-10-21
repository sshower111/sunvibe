'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Navigation } from '@/components/navigation'
import { PageBand } from '@/components/page-band'
import { Footer } from '@/components/footer'
import { galleryAlt, canOptimizeGalleryImage } from '@/lib/gallery-images'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, ImageIcon, ZoomIn } from 'lucide-react'

function GalleryPhoto({ src, index, expanded = false }: { src: string; index: number; expanded?: boolean }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  return (
    <span
      className={
        'relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-secondary ' +
        (expanded ? 'h-[55dvh]' : 'aspect-square')
      }
    >
      {failed ? (
        <span role="status" className="flex flex-col items-center gap-3 p-4 text-center text-sm text-muted-foreground">
          <ImageIcon aria-hidden="true" />
          Photo unavailable
          {expanded && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFailed(false)
              }}
            >
              Retry photo
            </Button>
          )}
        </span>
      ) : (
        <Image
          src={src}
          unoptimized={!canOptimizeGalleryImage(src)}
          fill
          sizes={
            expanded ? '(min-width: 900px) 850px, 95vw' : '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw'
          }
          alt={galleryAlt(src)}
          loading={expanded ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className={'h-full w-full ' + (expanded ? 'object-contain' : 'object-cover')}
        />
      )}
    </span>
  )
}

// Photos arrive from the server (app/gallery/page.tsx); no extra request per visit.
export function GalleryView({ galleryImages }: { galleryImages: string[] }) {
  const [selected, setSelected] = useState<number | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const touchX = useRef<number | null>(null)
  const count = galleryImages.length
  const move = (direction: number) =>
    setSelected(index => (index === null ? null : (index + direction + count) % count))
  // A photo clicked in the home page strip arrives as /gallery?photo=<url>: open it straight away,
  // then drop the query so closing, refreshing or sharing the page shows the plain gallery.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const photo = params.get('photo')
    if (!photo) return
    window.history.replaceState(null, '', window.location.pathname)
    const index = galleryImages.indexOf(photo)
    if (index === -1) return
    const thumb = document.querySelector<HTMLButtonElement>(`[data-gallery-index="${index}"]`)
    thumb?.scrollIntoView({ block: 'center' })
    triggerRef.current = thumb
    setSelected(index)
  }, [galleryImages])
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main id="main-content" tabIndex={-1}>
        <PageBand
          id="gallery-heading"
          title="Our Las Vegas bakery gallery"
          aside={
            <Button
              asChild
              variant="outline"
              className="min-h-12 w-full border-white/70 bg-transparent text-white hover:border-white hover:bg-white/10 sm:w-auto"
            >
              <a href="/menu">Explore the menu</a>
            </Button>
          }
        >
          <p>Buns, mooncakes and celebration cakes from our kitchen on Spring Mountain Road.</p>
        </PageBand>
        <div className="site-container section-space">
          {count ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
              {galleryImages.map((src, index) => (
                <button
                  type="button"
                  key={src + index}
                  data-gallery-index={index}
                  aria-label={'Enlarge: ' + galleryAlt(src)}
                  onClick={event => {
                    triggerRef.current = event.currentTarget
                    setSelected(index)
                  }}
                  className="group relative rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                >
                  <GalleryPhoto src={src} index={index} />
                  <span
                    aria-hidden="true"
                    className="absolute bottom-2 right-2 rounded-full bg-white/95 p-2 text-primary shadow-sm"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-white card-pad text-center">
              <h2 className="heading-2">More photos coming soon</h2>
              <p className="mt-2 text-muted-foreground">Explore our menu to see what’s baking.</p>
            </div>
          )}
        </div>
        <Dialog
          open={selected !== null}
          onOpenChange={open => {
            if (!open) setSelected(null)
          }}
        >
          <DialogContent
            className="max-h-[90dvh] overflow-y-auto bg-white sm:max-w-4xl"
            onCloseAutoFocus={event => {
              event.preventDefault()
              triggerRef.current?.focus()
            }}
            onKeyDown={event => {
              if (event.key === 'ArrowLeft') {
                event.preventDefault()
                move(-1)
              }
              if (event.key === 'ArrowRight') {
                event.preventDefault()
                move(1)
              }
            }}
          >
            <DialogTitle className="sr-only">Sunville Bakery gallery</DialogTitle>
            <DialogDescription className="sr-only">
              Use the arrow buttons or arrow keys to browse photos. Swipe on touch screens.
            </DialogDescription>
            {/* Arrows sit on the photo's left and right edges; swipe also works on phones. */}
            <div
              className="relative"
              onTouchStart={event => {
                touchX.current = event.touches[0].clientX
              }}
              onTouchEnd={event => {
                if (touchX.current === null) return
                const distance = event.changedTouches[0].clientX - touchX.current
                touchX.current = null
                if (Math.abs(distance) > 40) move(distance > 0 ? -1 : 1)
              }}
            >
              {selected !== null && (
                <GalleryPhoto
                  key={galleryImages[selected] + selected}
                  src={galleryImages[selected]}
                  index={selected}
                  expanded
                />
              )}
              {count > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() => move(-1)}
                    className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary shadow-md hover:bg-white focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <ChevronLeft aria-hidden="true" className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() => move(1)}
                    className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary shadow-md hover:bg-white focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <ChevronRight aria-hidden="true" className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>
            <p role="status" className="text-center text-sm text-muted-foreground">
              {(selected ?? 0) + 1} / {count}
            </p>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  )
}
