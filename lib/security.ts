/**
 * Fixed-window rate limiter kept in memory.
 * Limits apply per server instance; a shared store (e.g. Upstash Redis) would be needed for a global limit.
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

  /** Removes expired windows. */
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

if (typeof window === 'undefined') {
  setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000)
}

/**
 * Escapes text for safe insertion into HTML (email bodies).
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
 * Basic email shape check (something@domain.tld).
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Reduces a filename to safe characters to prevent path traversal.
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.+/g, '.')
    .replace(/^\./, '')
    .substring(0, 255)
}

/**
 * Client IP from the first x-forwarded-for entry (set by Vercel), or "unknown".
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
  return ip || 'unknown'
}
