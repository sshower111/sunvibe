import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { isAdminRequest } from '@/lib/occasion-admin'
import { editGallery } from '@/lib/database-content'
import { getPublicGallery } from '@/lib/public-gallery'
import { deletePhotoIfUnused } from '@/lib/photo-storage'

// Public pages render the gallery on the server; this endpoint is used by the admin panel.
export async function GET() {
  return NextResponse.json(await getPublicGallery(), { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  try {
    const { action, url, password } = await req.json()
    if (!(await isAdminRequest(password))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['add', 'remove'].includes(action) || typeof url !== 'string' || url.length > 2048 || !/^https:\/\//.test(url))
      return NextResponse.json({ error: 'Invalid gallery change' }, { status: 400 })
    await editGallery(action, url)
    revalidateTag('gallery-images')
    // Free storage space: delete our own uploaded file unless a menu item or occasion still uses it.
    const fileDeleted = action === 'remove' ? await deletePhotoIfUnused(url) : false
    return NextResponse.json({ success: true, fileDeleted })
  } catch (error) {
    console.error('Error updating gallery:', error)
    return NextResponse.json({ error: 'Failed to update gallery. Please try again.' }, { status: 500 })
  }
}
