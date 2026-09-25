import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { readSeasonalBanners, writeSeasonalBanners } from '@/lib/seasonal-store'
import { seasonalSchema } from '@/lib/seasonal-schema'
export async function POST(request: NextRequest) {
  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const secret = process.env.ADMIN_PASSWORD
  if (!secret || typeof body?.password !== 'string' || !timingSafeEqual(createHash('sha256').update(body.password).digest(), createHash('sha256').update(secret).digest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    if (body.action === 'read') return NextResponse.json({ banners: await readSeasonalBanners() }, { headers: { 'Cache-Control': 'no-store' } })
    if (body.action !== 'save') return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    const parsed = seasonalSchema.safeParse(body.banners)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    await writeSeasonalBanners(parsed.data)
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Banner storage unavailable. Please retry; your changes have not been confirmed saved.' }, { status: 503 }) }
}
