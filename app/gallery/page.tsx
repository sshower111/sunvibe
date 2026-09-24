"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { galleryImages as fallbackImages, galleryAlt, canOptimizeGalleryImage } from "@/lib/gallery-images"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ArrowLeft, ArrowRight, ImageIcon, ZoomIn } from "lucide-react"

function GalleryPhoto({ src, index, expanded = false }: { src: string; index: number; expanded?: boolean }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  return <span className={'relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-secondary ' + (expanded ? 'h-[55dvh]' : 'aspect-square')}>
    {failed ? <span role="status" className="flex flex-col items-center gap-3 p-4 text-center text-sm text-muted-foreground"><ImageIcon aria-hidden="true" />Photo unavailable{expanded && <Button type="button" variant="outline" onClick={() => { setFailed(false) }}>Retry photo</Button>}</span> :
      <Image src={src} unoptimized={!canOptimizeGalleryImage(src)} fill sizes={expanded ? "(min-width: 900px) 850px, 95vw" : "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"} alt={expanded ? galleryAlt(src) : ""} loading={expanded ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} className={'h-full w-full ' + (expanded ? 'object-contain' : 'object-cover')} />}
  </span>
}

export default function GalleryPage() {
  const [galleryImages, setGalleryImages] = useState(fallbackImages)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/gallery', { cache: 'no-store', signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Gallery unavailable'); return response.json() })
      .then(data => { if (Array.isArray(data.images)) setGalleryImages(data.images.filter((image: unknown): image is string => typeof image === 'string')) })
      .catch(() => {})
    return () => controller.abort()
  }, [])




  const [selected, setSelected] = useState<number | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const count = galleryImages.length
  const move = (direction: number) => setSelected(index => index === null ? null : (index + direction + count) % count)
  return <div className="min-h-screen bg-background">
    <Navigation />
    <main id="main-content" tabIndex={-1}>
    <div className="site-container page-space">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-1 text-sm font-medium text-primary">A look inside Sunville Bakery</p><h1 className="heading-1">Our Las Vegas bakery gallery</h1><p className="mt-3 text-muted-foreground">Explore our breads, pastries, and baked goods. Select a photo for a closer look.</p></div>
        <Button asChild variant="outline" className="min-h-12"><a href="/menu">Explore the menu <ArrowRight aria-hidden="true" /></a></Button>
      </header>
      <p className="mb-4 text-sm text-muted-foreground">{count} photos</p>
      {count ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {galleryImages.map((src, index) => <button type="button" key={src + index} aria-label={'Enlarge: ' + galleryAlt(src)} onClick={event => { triggerRef.current = event.currentTarget; setSelected(index) }} className="group relative rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          <GalleryPhoto src={src} index={index} /><span aria-hidden="true" className="absolute bottom-2 right-2 rounded-full bg-white/95 p-2 text-primary shadow-sm"><ZoomIn className="h-4 w-4" /></span>
        </button>)}
      </div> : <div className="rounded-xl border bg-white p-8 text-center"><h2 className="heading-2">More photos coming soon</h2><p className="mt-2 text-muted-foreground">Explore our menu to see what’s baking.</p></div>}
    </div>
    <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null) }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-white sm:max-w-4xl" onCloseAutoFocus={event => { event.preventDefault(); triggerRef.current?.focus() }} onKeyDown={event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) }
        if (event.key === 'ArrowRight') { event.preventDefault(); move(1) }
      }}>
        <DialogTitle className="heading-3 pr-12">Sunville Bakery gallery</DialogTitle>
        <DialogDescription>Use the arrows to explore photos. Press Escape to close.</DialogDescription>
        {selected !== null && <GalleryPhoto key={galleryImages[selected] + selected} src={galleryImages[selected]} index={selected} expanded />}
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" className="min-h-12" aria-label="Previous photo" disabled={count < 2} onClick={() => move(-1)}><ArrowLeft aria-hidden="true" /><span className="hidden sm:inline">Previous</span></Button>
          <p role="status" className="text-sm text-muted-foreground">Photo {(selected ?? 0) + 1} of {count}</p>
          <Button variant="outline" className="min-h-12" aria-label="Next photo" disabled={count < 2} onClick={() => move(1)}><span className="hidden sm:inline">Next</span><ArrowRight aria-hidden="true" /></Button>
        </div>
      </DialogContent>
    </Dialog>
    </main>
    <Footer />
  </div>
}
