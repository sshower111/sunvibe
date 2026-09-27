import 'server-only'
import { createClient } from '@supabase/supabase-js'
export function usesSupabaseStorage() { return process.env.PHOTO_STORAGE === 'supabase' }
export async function uploadPhoto(pathname: string, file: File) {
 const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url || !key) throw new Error('Photo storage is not configured')
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
 const bucket=process.env.SUPABASE_STORAGE_BUCKET || 'bakery-images'
 const {error}=await client.storage.from(bucket).upload(pathname,file,{contentType:file.type,cacheControl:'31536000',upsert:false})
 if(error) throw new Error('Photo upload unavailable')
 return client.storage.from(bucket).getPublicUrl(pathname).data.publicUrl
}
