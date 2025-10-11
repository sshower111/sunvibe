import crypto from 'crypto'

/**
 * Rate limiter - Simple in-memory implementation
 * For production, use Redis or a service like Upstash
 */
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map()

  check(identifier: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const record = this.requests.get(identifier)

    if (!record || now > record.resetTime) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      })
      return true
    }

    if (record.count >= limit) {
      return false
    }

    record.count++
    return true
  }

  // Clean up old entries periodically
  cleanup() {
    const now = Date.now()
    for (const [key, value] of this.requests.entries()) {
      if (now > value.resetTime) {
        this.requests.delete(key)
      }
    }
  }
}

export const rateLimiter = new RateLimiter()

// Run cleanup every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000)
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Use a dummy comparison to maintain constant time
    crypto.timingSafeEqual(
      Buffer.from(a.padEnd(b.length)),
      Buffer.from(b.padEnd(a.length))
    )
    return false
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.+/g, '.')
    .replace(/^\./, '')
    .substring(0, 255)
}

/**
 * Validate and sanitize pickup time
 */
export function sanitizePickupTime(pickupTime: string | undefined): string {
  if (!pickupTime || typeof pickupTime !== 'string') {
    return 'ASAP'
  }

  const trimmed = pickupTime.trim()

  if (trimmed === 'ASAP') {
    return 'ASAP'
  }

  // Validate date format: YYYY-MM-DD at HH:MM AM/PM
  const dateTimeRegex = /^\d{4}-\d{2}-\d{2} at \d{1,2}:\d{2} (AM|PM)$/
  if (dateTimeRegex.test(trimmed)) {
    return trimmed
  }

  return 'ASAP'
}

/**
 * Get client IP from request
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
  return ip || 'unknown'
}
