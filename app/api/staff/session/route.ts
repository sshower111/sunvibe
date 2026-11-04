import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimiter } from '@/lib/security'
import {
  createStaffSessionToken,
  isStaffPassword,
  pickupRole,
  renewedStaffSession,
  STAFF_COOKIE,
  staffCookieOptions,
  staffToken,
} from '@/lib/staff-auth'

// Staff sign-in for the pickup screen (lib/staff-auth.ts). GET: who is signed in (renews the staff session).
export async function GET(request: NextRequest) {
  const role = pickupRole(request)
  const response = NextResponse.json({ role }, { headers: { 'Cache-Control': 'no-store' } })
  const renewed = renewedStaffSession(staffToken(request))
  if (renewed) response.cookies.set(STAFF_COOKIE, renewed.token, staffCookieOptions(renewed.maxAge))
  return response
}

export async function POST(request: NextRequest) {
  try {
    if (!(await rateLimiter.check(`staff-verify:${getClientIp(request)}`, 5, 15 * 60 * 1000)))
      return NextResponse.json({ error: '嘗試太多次，請 15 分鐘後再試。' }, { status: 429 })
    const { password } = await request.json()
    if (!isStaffPassword(password)) return NextResponse.json({ error: '密碼不正確。' }, { status: 401 })
    const { token, maxAge } = createStaffSessionToken()
    const response = NextResponse.json({ success: true })
    response.cookies.set(STAFF_COOKIE, token, staffCookieOptions(maxAge))
    return response
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(STAFF_COOKIE, '', staffCookieOptions(0))
  return response
}
