"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { galleryImages as fallbackImages, galleryAlt, canOptimizeGalleryImage } from "@/lib/gallery-images"
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"

function FeaturedPhoto({ src, detail = false }: { src: string; detail?: boolean }) {
  const [failed, setFailed] = useState(false)
  return <span className={'relative flex items-center justify-center overflow-hidden rounded-lg bg-secondary ' + (detail ? 'h-[50dvh]' : 'aspect-square')}>
    {failed ? <span className="p-4 text-center text-sm text-muted-foreground">Photo unavailable</span> : <Image src={src} unoptimized={!canOptimizeGalleryImage(src)} fill sizes={detail ? "(min-width: 768px) 720px, 95vw" : "(min-width: 768px) 33vw, 50vw"} alt={galleryAlt(src)} loading={detail ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} className={'h-full w-full ' + (detail ? 'object-contain' : 'object-cover')} />}
  </span>
}

export function FeaturedGallery() {
  const [galleryImages, setGalleryImages] = useState(fallbackImages)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/gallery', { cache: 'no-store', signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Gallery unavailable'); return response.json() })
      .then(data => { if (Array.isArray(data.images)) setGalleryImages(data.images.filter((image: unknown): image is string => typeof image === 'string')) })
      .catch(() => {})
    return () => controller.abort()
  }, [])




  return <section aria-labelledby="featured-heading" className="border-t bg-white section-space">
    <div className="site-container">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h2 id="featured-heading" className="heading-2">A taste of Sunville</h2><p className="mt-3 text-muted-foreground">Take a closer look at our bakery. Browse the menu for descriptions and prices.</p></div><Link href="/gallery" className="inline-flex min-h-12 items-center font-medium text-primary underline underline-offset-4">View all photos</Link></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
        {galleryImages.slice(0, 6).map((src, index) => <Dialog key={src}>
          <DialogTrigger asChild><button type="button" aria-label={'Enlarge: ' + galleryAlt(src)} className="rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"><FeaturedPhoto src={src} /></button></DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto bg-white sm:max-w-3xl"><DialogTitle className="heading-3 pr-8">A taste of Sunville</DialogTitle><DialogDescription>Photo {index + 1} from our bakery gallery.</DialogDescription><FeaturedPhoto src={src} detail /><Link href="/menu" className={buttonVariants()}>Explore the menu</Link></DialogContent>
        </Dialog>)}
      </div>
    </div>
  </section>
}
