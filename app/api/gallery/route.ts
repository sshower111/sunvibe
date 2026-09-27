import { isAdminRequest } from '@/lib/occasion-admin'
import { usesDatabase } from '@/lib/database'
import { editGallery } from '@/lib/database-content'
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { revalidateTag } from 'next/cache'
import { getPublicGallery, readGalleryImages } from '@/lib/public-gallery'
import { deletePhotoIfUnused } from '@/lib/photo-storage'

const GALLERY_DATA_KEY = 'gallery-data.json'

async function writeGalleryImages(images: string[]): Promise<void> {
  await put(GALLERY_DATA_KEY, JSON.stringify({ images }), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

// Public pages render the gallery on the server; this endpoint is used by the admin panel.
export async function GET() {
  const result = await getPublicGallery()
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, url, password } = body

    if (!(await isAdminRequest(password))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['add','remove'].includes(action) || typeof url !== 'string' || url.length > 2048 || !/^https:\/\//.test(url)) return NextResponse.json({error:'Invalid gallery change'}, {status:400})
    if (usesDatabase('content')) {
      await editGallery(action, url)
      revalidateTag('gallery-images')
      // Free storage space: delete our own uploaded file unless a menu item or occasion still uses it.
      const fileDeleted = action === 'remove' ? await deletePhotoIfUnused(url) : false
      return NextResponse.json({ success: true, fileDeleted })
    }
    const images = await readGalleryImages(true)
    const updated = action === 'add' ? (images.includes(url) ? images : [...images, url]) : images.filter(img => img !== url)
    await writeGalleryImages(updated)
    revalidateTag('blob-locations')
    revalidateTag('gallery-images')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating gallery:', error)
    return NextResponse.json({ error: 'Failed to update gallery. Please try again.' }, { status: 500 })
  }
}
