import { NextRequest, NextResponse } from 'next/server'
import { put, list } from '@vercel/blob'
import { constantTimeCompare } from '@/lib/security'
import { galleryImages } from '@/lib/gallery-images'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const GALLERY_DATA_KEY = 'gallery-data.json'

async function readGalleryImages(): Promise<string[]> {
  const { blobs } = await list({ prefix: GALLERY_DATA_KEY, limit: 1 })
  if (blobs.length === 0) {
    return galleryImages
  }
  const res = await fetch(`${blobs[0].url}?t=${Date.now()}`)
  const data = await res.json()
  return data.images || []
}

async function writeGalleryImages(images: string[]): Promise<void> {
  await put(GALLERY_DATA_KEY, JSON.stringify({ images }), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

export async function GET() {
  try {
    const images = await readGalleryImages()
    return NextResponse.json({ images })
  } catch (error) {
    console.error('Error reading gallery images:', error)
    return NextResponse.json({ error: 'Failed to read images' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, url, password } = body

    if (!ADMIN_PASSWORD || !constantTimeCompare(password, ADMIN_PASSWORD)) {
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
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating gallery:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Failed to update gallery: ${message}` }, { status: 500 })
  }
}
