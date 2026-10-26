import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { database } from './database'
import { decryptBytes, encryptBytes } from './storage-crypto'
const bucket = () => process.env.SUPABASE_STORAGE_BUCKET || 'bakery-images'
let client: SupabaseClient | undefined
function storage() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Photo storage is not configured')
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return client.storage.from(bucket())
}
/** Uploads checked image bytes; contentType must come from the bytes (lib/image-type.ts), not the browser. */
export async function uploadPhoto(pathname: string, data: Buffer, contentType: string) {
  const { error } = await storage().upload(pathname, data, {
    contentType,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new Error('Photo upload unavailable')
  return storage().getPublicUrl(pathname).data.publicUrl
}
/** Path inside our bucket for a public URL we issued, or null for any other URL. */
function ownedPath(url: string) {
  if (!process.env.SUPABASE_URL) return null
  const prefix = new URL(process.env.SUPABASE_URL).origin + '/storage/v1/object/public/' + bucket() + '/'
  return url.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length)) : null
}
/**
 * Deletes an uploaded photo after it is removed from the gallery, so storage does not grow forever.
 * Skipped (returns false) for outside links, or when a menu item, occasion or the gallery still uses it.
 */
export async function deletePhotoIfUnused(url: string) {
  const path = ownedPath(url)
  if (!path) return false
  try {
    const sql = database()
    const [inGallery, inMenu, inCampaign] = await Promise.all([
      sql`SELECT 1 FROM bakery_gallery WHERE url=${url} LIMIT 1`,
      sql`SELECT 1 FROM bakery_menu WHERE image=${url} LIMIT 1`,
      sql`SELECT 1 FROM bakery_campaigns WHERE strpos(payload::text, ${url}) > 0 LIMIT 1`,
    ])
    if (inGallery.length || inMenu.length || inCampaign.length) return false
    const { error } = await storage().remove([path])
    return !error
  } catch {
    return false
  }
}
/** Saves bytes that must not be public (customer photos). Stored encrypted, so the public bucket URL is useless. */
export async function uploadPrivateFile(pathname: string, data: Buffer) {
  const { error } = await storage().upload(pathname, encryptBytes(data), {
    contentType: 'application/octet-stream',
    upsert: true,
  })
  if (error) throw new Error('File upload unavailable')
}
/** Reads a file saved with uploadPrivateFile. */
export async function downloadPrivateFile(pathname: string) {
  const { data, error } = await storage().download(pathname)
  if (error || !data) throw new Error('File unavailable')
  return decryptBytes(Buffer.from(await data.arrayBuffer()))
}
