import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { staffConfigured } from '@/lib/staff-auth'
import { SITE_URL } from '@/lib/seo'

// Admin → Settings → Staff phones: whether STAFF_PASSWORD is set, and the setup link for the QR code.
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(
    { configured: staffConfigured(), setupUrl: `${SITE_URL}/staff` },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
