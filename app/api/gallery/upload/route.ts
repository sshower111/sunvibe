import { randomUUID } from 'node:crypto'
import { uploadPhoto, usesSupabaseStorage } from '@/lib/photo-storage'
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { constantTimeCompare, sanitizeFilename, rateLimiter, getClientIp } from '@/lib/security'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req)
    if (!rateLimiter.check(`gallery-upload:${clientIp}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many uploads. Please try again later.' },
        { status: 429 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const password = formData.get('password') as string

    if (!ADMIN_PASSWORD || typeof password !== 'string' || !constantTimeCompare(password, ADMIN_PASSWORD)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF allowed'
      }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    const timestamp = randomUUID()
    const sanitized = sanitizeFilename(file.name)
    const pathname = `gallery/${timestamp}-${sanitized}`

    if (usesSupabaseStorage()) { const url=await uploadPhoto(pathname,file); return NextResponse.json({success:true,url,filename:pathname}) }
    const blob = await put(pathname, file, {
      access: 'public',
      contentType: file.type,
    })

    return NextResponse.json({
      success: true,
      url: blob.url,
      filename: pathname,
    })
  } catch (error) {
    // Never return storage credentials or provider internals to the browser.
    return NextResponse.json(
      { error: 'Photo uploads are temporarily unavailable. Please retry or check storage setup.' },
      { status: 500 }
    )
  }
}
