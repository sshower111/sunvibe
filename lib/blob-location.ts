import 'server-only'
import { head, BlobNotFoundError } from '@vercel/blob'
import { unstable_cache } from 'next/cache'
// File names are stable. Discover their URLs with a Simple Operation, never list().
// Cache both missing objects and failures to avoid repeated probes during suspension.
const successfulLocation = unstable_cache(async (pathname: string) => (await head(pathname)).url, ['blob-known-urls-v1'], { revalidate: 86400, tags: ['blob-locations'] })
const discover = unstable_cache(async (pathname: string) => {
  try { return { url: await successfulLocation(pathname), unavailable: false } }
  catch (error) { if (error instanceof BlobNotFoundError) return { url: null, unavailable: false }; return { url: null, unavailable: true } }
}, ['blob-file-locations-v1'], { revalidate: 900, tags: ['blob-locations'] })
export async function blobLocation(pathname: string) {
 const result = await discover(pathname)
 if(result.unavailable) throw new Error('Storage temporarily unavailable')
 return result.url
}
