'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Navigation } from '@/components/navigation'
import { PageBand } from '@/components/page-band'
import { Footer } from '@/components/footer'
import { galleryAlt, canOptimizeGalleryImage } from '@/lib/gallery-images'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'

function GalleryPhoto({ src, index, expanded = false }: { src: string; index: number; expanded?: boolean }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  return (
    <span
      className={
        'relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-secondary ' +
        (expanded ? 'h-[65dvh] sm:h-[55dvh]' : 'aspect-square')
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
          className={
            'h-full w-full ' +
            (expanded
              ? 'object-contain'
              : 'object-cover transition-transform duration-200 ease-standard [@media(hover:hover)]:group-hover:scale-[1.04]')
          }
        />
      )}
    </span>
  )
}

type View = { scale: number; x: number; y: number }
const FIT: View = { scale: 1, x: 0, y: 0 }
const MAX_ZOOM = 4

/**
 * The enlarged photo. Pinch or double-tap (double-click) to zoom, drag to look around a zoomed photo,
 * and swipe sideways on a touch screen for the next photo, only when not zoomed in, so zooming never flips photos.
 */
function ZoomablePhoto({ children, onSwipe }: { children: ReactNode; onSwipe: (direction: number) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [view, setViewState] = useState(FIT)
  const viewRef = useRef(FIT)
  const [dragging, setDragging] = useState(false)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  // One touch-down to the last lift. Re-based whenever a finger is added or lifted.
  const gesture = useRef<{
    startX: number
    startY: number
    dist: number
    from: View
    moved: boolean
    pinched: boolean
    touch: boolean
  } | null>(null)
  const lastTap = useRef(0)

  function setView(next: View) {
    const rect = box.current!.getBoundingClientRect()
    const scale = Math.min(MAX_ZOOM, Math.max(1, next.scale))
    const maxX = (rect.width * (scale - 1)) / 2
    const maxY = (rect.height * (scale - 1)) / 2
    const clamped = {
      scale,
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    }
    viewRef.current = clamped
    setViewState(clamped)
  }
  const spread = () => {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }
  function rebase(touch: boolean) {
    const [first] = pointers.current.values()
    gesture.current = {
      startX: first.x,
      startY: first.y,
      dist: pointers.current.size > 1 ? spread() : 0,
      from: viewRef.current,
      moved: gesture.current?.moved ?? false,
      pinched: (gesture.current?.pinched ?? false) || pointers.current.size > 1,
      touch,
    }
  }
  /** Double tap: zoom in on that spot, or back out. */
  function toggleZoom(x: number, y: number) {
    if (viewRef.current.scale > 1) return setView(FIT)
    const rect = box.current!.getBoundingClientRect()
    const scale = 2.5
    setView({
      scale,
      x: -(x - rect.left - rect.width / 2) * (scale - 1),
      y: -(y - rect.top - rect.height / 2) * (scale - 1),
    })
  }

  return (
    <div
      ref={box}
      className="touch-none overflow-hidden rounded-xl select-none"
      onPointerDown={event => {
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {}
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
        setDragging(true)
        rebase(event.pointerType === 'touch')
      }}
      onPointerMove={event => {
        const g = gesture.current
        if (!g || !pointers.current.has(event.pointerId)) return
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
        if (pointers.current.size > 1 && g.dist) {
          const scale = (g.from.scale * spread()) / g.dist
          setView({ scale, x: (g.from.x * scale) / g.from.scale, y: (g.from.y * scale) / g.from.scale })
          g.moved = true
          return
        }
        const dx = event.clientX - g.startX
        const dy = event.clientY - g.startY
        if (Math.hypot(dx, dy) > 8) g.moved = true
        if (g.from.scale > 1) setView({ ...g.from, x: g.from.x + dx, y: g.from.y + dy })
      }}
      onPointerUp={event => {
        const g = gesture.current
        pointers.current.delete(event.pointerId)
        if (!g) return
        if (pointers.current.size) return rebase(g.touch)
        gesture.current = null
        setDragging(false)
        const dx = event.clientX - g.startX
        const dy = event.clientY - g.startY
        if (!g.moved) {
          const now = Date.now()
          if (now - lastTap.current < 300) {
            lastTap.current = 0
            toggleZoom(event.clientX, event.clientY)
          } else lastTap.current = now
        } else if (
          g.touch &&
          !g.pinched &&
          viewRef.current.scale === 1 &&
          Math.abs(dx) > 50 &&
          Math.abs(dx) > Math.abs(dy)
        )
          onSwipe(dx > 0 ? -1 : 1)
      }}
      onPointerCancel={event => {
        pointers.current.delete(event.pointerId)
        if (!pointers.current.size) {
          gesture.current = null
          setDragging(false)
        }
      }}
    >
      <div
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          transition: dragging ? 'none' : 'transform 200ms ease-out',
        }}
        className={view.scale > 1 ? 'cursor-grab' : 'cursor-zoom-in'}
      >
        {children}
      </div>
    </div>
  )
}

// Photos arrive from the server (app/gallery/page.tsx); no extra request per visit.
export function GalleryView({ galleryImages }: { galleryImages: string[] }) {
  const [selected, setSelected] = useState<number | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
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
                  className="group relative cursor-zoom-in rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                >
                  <GalleryPhoto src={src} index={index} />
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-card card-pad text-center">
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
              Use the arrow buttons or arrow keys to browse photos. Double-tap or pinch to zoom; swipe on touch screens.
            </DialogDescription>
            {/* Mouse: arrows on the photo's edges. Touch screens: no arrows on the photo (they got in the way of
                zooming); swipe, or use the small buttons under it. */}
            <div className="relative">
              {selected !== null && (
                <ZoomablePhoto key={galleryImages[selected] + selected} onSwipe={move}>
                  <GalleryPhoto src={galleryImages[selected]} index={selected} expanded />
                </ZoomablePhoto>
              )}
              {count > 1 && (
                <div className="[@media(pointer:coarse)]:hidden">
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
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-4">
              {count > 1 && (
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() => move(-1)}
                  className="hidden size-11 items-center justify-center rounded-full text-primary [@media(pointer:coarse)]:flex"
                >
                  <ChevronLeft aria-hidden="true" className="size-6" />
                </button>
              )}
              <p role="status" className="text-center text-sm text-muted-foreground">
                {(selected ?? 0) + 1} / {count}
              </p>
              {count > 1 && (
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() => move(1)}
                  className="hidden size-11 items-center justify-center rounded-full text-primary [@media(pointer:coarse)]:flex"
                >
                  <ChevronRight aria-hidden="true" className="size-6" />
                </button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  )
}
