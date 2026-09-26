import { createHash } from 'node:crypto'
import { hasMeaningfulMessage } from '@/lib/contact-validation'
import { verifyTurnstile } from "@/lib/turnstile"
import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { escapeHtml, isValidEmail, rateLimiter, getClientIp } from "@/lib/security"


export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 3 messages per 10 minutes per IP
    const clientIp = getClientIp(request)
    if (!rateLimiter.check(`contact:${clientIp}`, 3, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'JSON required' }, { status: 415 })
    }
    // Bound the actual stream, not just the caller-controlled Content-Length.
    const reader = request.body?.getReader()
    if (!reader) return NextResponse.json({ error: 'Body required' }, { status: 400 })
    const chunks: Uint8Array[] = []
    let bytes = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > 32768) { await reader.cancel(); return NextResponse.json({ error: 'Request too large' }, { status: 413 }) }
      chunks.push(value)
    }
    let body
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const { name, email, phone, message, captchaToken, website } = body || {}

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      )
    }

    // Validate types
    if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
      return NextResponse.json(
        { error: "Invalid input types" },
        { status: 400 }
      )
    }

    if (!name.trim() || !message.trim() || (phone != null && typeof phone !== "string")) {
      return NextResponse.json({ error: "Please provide a valid name, message, and phone number" }, { status: 400 })
    }

    if ((website != null && (typeof website !== 'string' || website.trim() !== '')) || !hasMeaningfulMessage(message)) {
      return NextResponse.json({ error: 'Please describe your question in words, not just numbers or a link.' }, { status: 400 })
    }
    if (phone && (!/^[+\d\s().-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7)) {
      return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 })
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Validate length limits
    if (name.length > 100 || email.length > 100 || message.length > 5000 || (phone && phone.length > 30)) {
      return NextResponse.json(
        { error: "Input exceeds maximum length" },
        { status: 400 }
      )
    }

    if (!process.env.TURNSTILE_SECRET_KEY || !process.env.TURNSTILE_ALLOWED_HOSTNAMES) {
      return NextResponse.json({ error: 'Online messages are temporarily unavailable. Please call the bakery.' }, { status: 503 })
    }
    if (!await verifyTurnstile(captchaToken, 'contact')) {
      return NextResponse.json({ error: 'Please complete the verification and try again.' }, { status: 403 })
    }
    const resend = new Resend(process.env.RESEND_API_KEY)
    // Sanitize inputs to prevent XSS
    const safeName = escapeHtml(name.trim())
    const safeEmail = escapeHtml(email.trim().toLowerCase())
    const safePhone = phone ? escapeHtml(phone.trim()) : "Not provided"
    const safeMessage = escapeHtml(message.trim()).replace(/\n/g, "<br>")

    // Provider-side idempotency suppresses identical deliveries across server instances
    // for Resend's 24-hour retention window. This is not a shared IP rate limiter.
    const duplicateKey = createHash('sha256').update(JSON.stringify([safeName, safeEmail, safePhone, safeMessage])).digest('hex')
    // Send email notification to bakery
    const result = await resend.emails.send({
      from: "Sunville Bakery Website <onboarding@resend.dev>",
      to: process.env.NOTIFICATION_EMAIL || "sunvillebakerylv@gmail.com",
      subject: `New Contact Form Submission from ${safeName}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Phone:</strong> ${safePhone}</p>
        <p><strong>Message:</strong></p>
        <p>${safeMessage}</p>
      `,
    }, { idempotencyKey: "contact-" + duplicateKey })

    if (result.error) {
      console.error("Contact email provider error:", result.error.message)
      return NextResponse.json({ error: "Your message could not be sent. Please try again or call us." }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Contact form error:", error)
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    )
  }
}
