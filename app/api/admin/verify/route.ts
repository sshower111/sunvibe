import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { rateLimiter, getClientIp } from '@/lib/security'
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  createAdminSessionToken,
  hasAdminSession,
  isAdminPassword,
  renewedAdminSession,
} from '@/lib/admin-auth'

// Is the current browser signed in? Used by the admin pages on load. Home Screen app sessions are renewed here.
export async function GET() {
  const authenticated = await hasAdminSession()
  const response = NextResponse.json({ authenticated }, { headers: { 'Cache-Control': 'no-store' } })
  const renewed = authenticated ? renewedAdminSession((await cookies()).get(ADMIN_COOKIE)?.value) : null
  if (renewed) response.cookies.set(ADMIN_COOKIE, renewed.token, adminCookieOptions(renewed.maxAge))
  return response
}

// Sign in: exchanges the password for an httpOnly session cookie. `device` is true when signing in from the
// Home Screen app, which then stays signed in (see lib/admin-auth.ts).
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    if (!(await rateLimiter.check(`admin-verify:${getClientIp(request)}`, 5, 15 * 60 * 1000))) {
      return NextResponse.json({ error: 'Too many attempts. Please try again in 15 minutes.' }, { status: 429 })
    }
    const { password, device } = await request.json()
    if (!process.env.ADMIN_PASSWORD) {
      console.error('ADMIN_PASSWORD not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    if (!isAdminPassword(password))
      return NextResponse.json({ success: false, error: 'Incorrect password.' }, { status: 401 })
    const { token, maxAge } = createAdminSessionToken(device === true)
    const response = NextResponse.json({ success: true })
    response.cookies.set(ADMIN_COOKIE, token, adminCookieOptions(maxAge))
    return response
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

// Sign out
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_COOKIE, '', adminCookieOptions(0))
  return response
}
