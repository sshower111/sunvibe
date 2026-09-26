import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { blobLocation } from '@/lib/blob-location'
import { unstable_cache, revalidateTag } from 'next/cache'
import { constantTimeCompare } from '@/lib/security'
import { galleryImages } from '@/lib/gallery-images'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const GALLERY_DATA_KEY = 'gallery-data.json'

async function readGalleryImages(): Promise<string[]> {
  const url = await blobLocation(GALLERY_DATA_KEY)
  if (!url) return galleryImages
  const res = await fetch(url + '?v=' + Date.now(), { cache: 'no-store', signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error('Gallery storage unavailable')
  const data = await res.json()
  if (!Array.isArray(data.images) || !data.images.every((image: unknown) => typeof image === 'string')) throw new Error('Invalid gallery data')
  return data.images
}

async function writeGalleryImages(images: string[]): Promise<void> {
  await put(GALLERY_DATA_KEY, JSON.stringify({ images }), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

const publicGallery = unstable_cache(async () => {
 try { return { images: await readGalleryImages(), degraded: false } }
 catch { return { images: galleryImages, degraded: true } }
}, ['public-gallery-v2'], { revalidate: 900, tags: ['gallery-images'] })
export async function GET() {
  const result = await publicGallery()
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, url, password } = body

    if (!ADMIN_PASSWORD || typeof password !== 'string' || !constantTimeCompare(password, ADMIN_PASSWORD)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const images = await readGalleryImages()

    let updated: string[]
    if (action === 'add') {
      updated = images.includes(url) ? images : [...images, url]
    } else if (action === 'remove') {
      updated = images.filter(img => img !== url)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    await writeGalleryImages(updated)
    revalidateTag('blob-locations')
    revalidateTag('gallery-images')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating gallery:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Failed to update gallery: ${message}` }, { status: 500 })
  }
}
