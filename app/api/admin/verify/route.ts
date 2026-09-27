import { NextRequest, NextResponse } from "next/server"
import { rateLimiter, getClientIp } from "@/lib/security"
import { ADMIN_COOKIE, adminCookieOptions, createAdminSessionToken, hasAdminSession, isOccasionAdmin } from "@/lib/occasion-admin"

// Is the current browser signed in? Used by the admin page on load.
export async function GET() {
  return NextResponse.json({ authenticated: await hasAdminSession() }, { headers: { 'Cache-Control': 'no-store' } })
}

// Sign in: exchanges the password for an httpOnly session cookie.
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    if (!rateLimiter.check(`admin-verify:${getClientIp(request)}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many attempts. Please try again in 15 minutes." }, { status: 429 })
    }
    const { password } = await request.json()
    if (!process.env.ADMIN_PASSWORD) {
      console.error('ADMIN_PASSWORD not configured')
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }
    if (!isOccasionAdmin(password)) return NextResponse.json({ success: false, error: "Incorrect password." }, { status: 401 })
    const { token, maxAge } = createAdminSessionToken()
    const response = NextResponse.json({ success: true })
    response.cookies.set(ADMIN_COOKIE, token, adminCookieOptions(maxAge))
    return response
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

// Sign out
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_COOKIE, '', adminCookieOptions(0))
  return response
}
