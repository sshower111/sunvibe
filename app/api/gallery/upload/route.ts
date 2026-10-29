import { isAdminRequest } from '@/lib/admin-auth'
import { randomUUID } from 'node:crypto'
import { uploadPhoto } from '@/lib/photo-storage'
import { imageTypeOf } from '@/lib/image-type'
import { NextRequest, NextResponse } from 'next/server'
import { readBody, parseForm } from '@/lib/request-body'
import { sanitizeFilename, rateLimiter, getClientIp } from '@/lib/security'

export const runtime = 'nodejs'
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req)
    if (!(await rateLimiter.check(`gallery-upload:${clientIp}`, 20, 60 * 60 * 1000))) {
      return NextResponse.json({ error: 'Too many uploads. Please try again later.' }, { status: 429 })
    }
    // Checked before the body is read, so signed-out requests never upload anything.
    if (!isAdminRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!req.headers.get('content-type')?.startsWith('multipart/form-data;')) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    const raw = await readBody(req, MAX_BYTES + 65536)
    if (!raw.ok) {
      return raw.reason === 'empty'
        ? NextResponse.json({ error: 'No file provided' }, { status: 400 })
        : NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 413 })
    }
    const formData = await parseForm(req, raw.body)
    const file = formData.get('file')

    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // The type comes from the file's own bytes, not the name or the type the browser claims.
    const data = Buffer.from(await file.arrayBuffer())
    const type = imageTypeOf(data)
    if (!type) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF allowed' }, { status: 400 })
    }

    const id = randomUUID()
    const sanitized = sanitizeFilename(file.name).replace(/\.[^.]*$/, '') || 'photo'
    // Menu item photos go in their own folder; everything else (gallery, occasions) in gallery/.
    const folder = formData.get('folder') === 'menu' ? 'menu' : 'gallery'
    const pathname = `${folder}/${id}-${sanitized}.${type.ext}`

    const url = await uploadPhoto(pathname, data, type.mime)
    return NextResponse.json({ success: true, url, filename: pathname })
  } catch {
    // Never return storage credentials or provider internals to the browser.
    return NextResponse.json(
      { error: 'Photo uploads are temporarily unavailable. Please retry or check storage setup.' },
      { status: 500 },
    )
  }
}
