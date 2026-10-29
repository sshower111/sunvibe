import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { reencryptLegacyData } from '@/lib/storage-reencrypt'

// Admin → Settings → Encryption key. "check" counts data still on the old ADMIN_PASSWORD-derived key;
// "reencrypt" moves it to CAMPAIGN_STORAGE_SECRET. Both are safe to repeat.
export async function POST(req: NextRequest) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (body.action !== 'check' && body.action !== 'reencrypt')
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  if (!process.env.CAMPAIGN_STORAGE_SECRET)
    return NextResponse.json({ error: 'CAMPAIGN_STORAGE_SECRET is not set in Vercel.' }, { status: 500 })
  try {
    return NextResponse.json(await reencryptLegacyData({ dryRun: body.action === 'check' }))
  } catch (error) {
    console.error('Re-encryption failed', error)
    return NextResponse.json({ error: 'Could not read saved data. Please retry.' }, { status: 500 })
  }
}
