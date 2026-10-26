import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { getCakeInquiry } from '@/lib/cake-inquiries-store'
import { INQUIRY_PHOTO_NAME, inquiryPhotoMime, readInquiryPhoto } from '@/lib/inquiry-photos'

export const runtime = 'nodejs'

/** GET ?id=<inquiry id>&file=1.jpg — one reference photo for the admin inquiry list (admin session only). */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return new NextResponse('Unauthorized', { status: 401 })
  const id = req.nextUrl.searchParams.get('id') ?? ''
  const file = req.nextUrl.searchParams.get('file') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(id) || !INQUIRY_PHOTO_NAME.test(file))
    return new NextResponse('Not found', { status: 404 })
  try {
    const inquiry = await getCakeInquiry(id)
    if (!inquiry?.photos?.includes(file)) return new NextResponse('Not found', { status: 404 })
    const data = await readInquiryPhoto(id, file)
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': inquiryPhotoMime(file),
        'Cache-Control': 'private, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new NextResponse('Photo unavailable', { status: 503 })
  }
}
