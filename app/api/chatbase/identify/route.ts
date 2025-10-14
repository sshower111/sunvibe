import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { userId, userMetadata } = await request.json()

    // Validate userId
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Valid userId is required' },
        { status: 400 }
      )
    }

    // Get secret key from environment variable
    const secret = process.env.CHATBASE_SECRET_KEY
    if (!secret) {
      console.error('CHATBASE_SECRET_KEY is not configured')
      return NextResponse.json(
        { error: 'Chatbase is not configured' },
        { status: 500 }
      )
    }

    // Generate HMAC-SHA256 hash
    const hash = crypto
      .createHmac('sha256', secret)
      .update(userId)
      .digest('hex')

    return NextResponse.json({
      userId,
      userHash: hash,
      userMetadata: userMetadata || {}
    })
  } catch (error) {
    console.error('Error generating Chatbase hash:', error)
    return NextResponse.json(
      { error: 'Failed to generate hash' },
      { status: 500 }
    )
  }
}
