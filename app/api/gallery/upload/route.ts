import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { constantTimeCompare, sanitizeFilename, rateLimiter, getClientIp } from '@/lib/security'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 20 uploads per hour per IP
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

    // Verify password using constant-time comparison
    if (!ADMIN_PASSWORD || !constantTimeCompare(password, ADMIN_PASSWORD)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type (be more specific)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF allowed'
      }, { status: 400 })
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'gallery')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename with better sanitization
    const timestamp = Date.now()
    const sanitized = sanitizeFilename(file.name)
    const filename = `${timestamp}-${sanitized}`
    const filepath = path.join(uploadsDir, filename)

    // Additional security: ensure filepath is within uploadsDir
    const resolvedPath = path.resolve(filepath)
    const resolvedUploadsDir = path.resolve(uploadsDir)
    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Return the public URL
    const publicUrl = `/gallery/${filename}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: filename
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
