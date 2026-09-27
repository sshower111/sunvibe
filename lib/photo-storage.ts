import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { database, usesDatabase } from './database'
export function usesSupabaseStorage() { return process.env.PHOTO_STORAGE === 'supabase' }
const bucket = () => process.env.SUPABASE_STORAGE_BUCKET || 'bakery-images'
let client: SupabaseClient | undefined
function storage() {
 const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url || !key) throw new Error('Photo storage is not configured')
 client ??= createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
 return client.storage.from(bucket())
}
export async function uploadPhoto(pathname: string, file: File) {
 const {error}=await storage().upload(pathname,file,{contentType:file.type,cacheControl:'31536000',upsert:false})
 if(error) throw new Error('Photo upload unavailable')
 return storage().getPublicUrl(pathname).data.publicUrl
}
/** Path inside our bucket for a public URL we issued, or null for any other URL. */
function ownedPath(url: string) {
 if(!process.env.SUPABASE_URL) return null
 const prefix=new URL(process.env.SUPABASE_URL).origin+'/storage/v1/object/public/'+bucket()+'/'
 return url.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length)) : null
}
/**
 * Deletes an uploaded photo after it is removed from the gallery, so storage does not grow forever.
 * Skipped (returns false) for outside links, or when a menu item, occasion or the gallery still uses it.
 */
export async function deletePhotoIfUnused(url: string) {
 const path=ownedPath(url)
 if(!path || !usesSupabaseStorage() || !usesDatabase('content') || !usesDatabase('menu')) return false
 try {
  const sql=database()
  const [inGallery,inMenu,inCampaign]=await Promise.all([
   sql`SELECT 1 FROM bakery_gallery WHERE url=${url} LIMIT 1`,
   sql`SELECT 1 FROM bakery_menu WHERE image=${url} LIMIT 1`,
   sql`SELECT 1 FROM bakery_campaigns WHERE strpos(payload::text, ${url}) > 0 LIMIT 1`,
  ])
  if(inGallery.length || inMenu.length || inCampaign.length) return false
  const {error}=await storage().remove([path])
  return !error
 } catch { return false }
}
