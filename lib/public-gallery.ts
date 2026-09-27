import 'server-only'
import { unstable_cache } from 'next/cache'
import { usesDatabase } from './database'
import { readGallery } from './database-content'
import { blobLocation } from './blob-location'
import { galleryImages } from './gallery-images'

// Single source for public gallery reads. Pages render this on the server (cached), so
// visitors never trigger a separate /api/gallery request.
export async function readGalleryImages(fresh = false): Promise<string[]> {
  if (usesDatabase('content')) return readGallery()
  // Legacy Blob path (rollback only).
  const url = await blobLocation('gallery-data.json')
  if (!url) return galleryImages
  // Admin writes read fresh data; public reads go through the cache below.
  const res = await fetch(fresh ? url + '?v=' + Date.now() : url, { ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: 900 } }), signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error('Gallery storage unavailable')
  const data = await res.json()
  if (!Array.isArray(data.images) || !data.images.every((image: unknown) => typeof image === 'string')) throw new Error('Invalid gallery data')
  return data.images
}

// Successful reads are cached for a day and refreshed right after admin edits
// (revalidateTag('gallery-images')). Failures are not cached, so an outage heals on its own.
const cachedGallery = unstable_cache(() => readGalleryImages(), ['public-gallery-v4', process.env.CONTENT_DATA_SOURCE || 'blob'], { revalidate: 86400, tags: ['gallery-images'] })
export async function getPublicGallery() {
  try { return { images: await cachedGallery(), degraded: false } }
  catch { return { images: galleryImages, degraded: true } }
}
