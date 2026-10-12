import 'server-only'
import { unstable_cache } from 'next/cache'
import { readGallery } from './database-content'
import { galleryImages } from './gallery-images'

// Single source for public gallery reads. Pages render this on the server, so visitors never
// trigger a separate request. Successful reads are cached for a day and refreshed right after
// admin edits (revalidateTag('gallery-images')); failures are not cached, so an outage heals itself.
const cachedGallery = unstable_cache(() => readGallery(), ['public-gallery-v5'], { revalidate: 86400, tags: ['gallery-images'] })
export async function getPublicGallery() {
  try { return { images: await cachedGallery(), degraded: false } }
  catch { return { images: galleryImages, degraded: true } }
}
