import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import sharp from 'sharp'
import { uploadPhoto } from '@/lib/photo-storage'
import { imageTypeOf } from '@/lib/image-type'
import { editGallery } from '@/lib/database-content'
import { readBody, parseForm } from '@/lib/request-body'
import { getClientIp, rateLimiter } from '@/lib/security'

export const runtime = 'nodejs'
// Vercel refuses request bodies over 4.5 MB, so the Shortcut resizes photos before sending.
const MAX_BYTES = 4 * 1024 * 1024
const reply = (message: string, status = 200) =>
  NextResponse.json(status === 200 ? { success: true, message } : { error: message }, { status })

/** True when the request carries GALLERY_SHARE_KEY as "Authorization: Bearer <key>". */
function hasShareKey(req: NextRequest) {
  const key = process.env.GALLERY_SHARE_KEY
  const sent = req.headers
    .get('authorization')
    ?.match(/^Bearer\s+(.+)$/i)?.[1]
    .trim()
  if (!key || key.length < 32 || !sent) return false
  const hash = (v: string) => createHash('sha256').update(v).digest()
  return timingSafeEqual(hash(sent), hash(key))
}

/**
 * Adds one photo to the public gallery from the iPhone "Add to Sunville gallery" Shortcut (docs/GALLERY-UPLOADS.md).
 * No admin sign-in: the Shortcut sends GALLERY_SHARE_KEY, which can only add gallery photos. Change the key in
 * Vercel to stop an old phone. Body: the image itself, or a form with the image in "file".
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!rateLimiter.check(`gallery-share:${ip}`, 60, 60 * 60 * 1000))
      return reply('Too many photos at once. Please try again in an hour.', 429)
    // The key is long and random (at least 32 characters), so it can't be guessed within the rate limit.
    if (!hasShareKey(req)) return reply('This Shortcut is not allowed to add photos. Check the key.', 401)
    const raw = await readBody(req, MAX_BYTES + 65536)
    if (!raw.ok)
      return raw.reason === 'empty'
        ? reply('No photo was sent.', 400)
        : reply('Photo is larger than 4 MB. Resize it in the Shortcut.', 413)
    let data: Buffer = raw.body
    if (req.headers.get('content-type')?.startsWith('multipart/form-data')) {
      const file = (await parseForm(req, raw.body)).get('file')
      if (!file || typeof file === 'string') return reply('No photo was sent.', 400)
      data = Buffer.from(await file.arrayBuffer())
    }
    if (data.length > MAX_BYTES) return reply('Photo is larger than 4 MB. Resize it in the Shortcut.', 413)
    const type = imageTypeOf(data)
    if (!type) return reply('Not a JPEG, PNG, WebP or GIF photo. Convert it to JPEG in the Shortcut.', 400)
    // Same result as Admin → Add photos: upright, at most 2,000 px, JPEG, and no metadata (so no GPS location).
    const jpeg = await sharp(data)
      .rotate()
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer()
    const url = await uploadPhoto(`gallery/${randomUUID()}-shared.jpg`, jpeg, 'image/jpeg')
    await editGallery('add', url)
    revalidateTag('gallery-images')
    return reply('Added to the gallery')
  } catch (error) {
    console.error('Gallery share failed', error)
    return reply('Could not add the photo. Please try again.', 500)
  }
}
