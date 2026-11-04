import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { getCustomerPhotos, PHOTO_FILE, readCustomerPhoto } from '@/lib/customer-photos'

export const runtime = 'nodejs'

/** GET ?id=<submission id>&file=<name>.jpg — one customer photo for admin (admin session only). */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return new NextResponse('Unauthorized', { status: 401 })
  const id = req.nextUrl.searchParams.get('id') ?? ''
  const file = req.nextUrl.searchParams.get('file') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(id) || !PHOTO_FILE.test(file)) return new NextResponse('Not found', { status: 404 })
  try {
    const entry = await getCustomerPhotos(id)
    if (!entry?.photos.some(p => p.file === file)) return new NextResponse('Not found', { status: 404 })
    return new NextResponse(new Uint8Array(await readCustomerPhoto(entry.orderId, file)), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new NextResponse('Photo unavailable', { status: 503 })
  }
}
