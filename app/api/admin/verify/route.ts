import { NextRequest, NextResponse } from "next/server"
import { constantTimeCompare, rateLimiter, getClientIp } from "@/lib/security"

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    const clientIp = getClientIp(request)
    if (!rateLimiter.check(`admin-verify:${clientIp}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      )
    }

    const { password } = await request.json()
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    if (!ADMIN_PASSWORD) {
      console.error('ADMIN_PASSWORD not configured')
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Use constant-time comparison to prevent timing attacks
    if (constantTimeCompare(password, ADMIN_PASSWORD)) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false }, { status: 401 })
    }
  } catch (error) {
    console.error('Admin verify error:', error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
