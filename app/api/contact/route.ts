import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { escapeHtml, isValidEmail, rateLimiter, getClientIp } from "@/lib/security"

const resend = new Resend(process.env.RESEND_API_KEY)

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

    const { name, email, phone, message } = await request.json()

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

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Validate length limits
    if (name.length > 100 || email.length > 100 || message.length > 5000) {
      return NextResponse.json(
        { error: "Input exceeds maximum length" },
        { status: 400 }
      )
    }

    // Sanitize inputs to prevent XSS
    const safeName = escapeHtml(name.trim())
    const safeEmail = escapeHtml(email.trim().toLowerCase())
    const safePhone = phone ? escapeHtml(phone.trim()) : "Not provided"
    const safeMessage = escapeHtml(message.trim()).replace(/\n/g, "<br>")

    // Send email notification to bakery
    await resend.emails.send({
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
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Contact form error:", error)
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    )
  }
}
