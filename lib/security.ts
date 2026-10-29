import { createHash } from 'node:crypto'
import { database } from './database'

/**
 * Fixed-window rate limiter kept in memory. Used only when the shared limit below can't reach the database,
 * so limits then apply per server instance.
 */
class MemoryRateLimiter {
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

const memoryLimiter = new MemoryRateLimiter()

if (typeof window === 'undefined') {
  // unref: the timer alone never keeps a Node process (or a test run) alive.
  setInterval(() => memoryLimiter.cleanup(), 5 * 60 * 1000).unref?.()
}

let warnedFallback = false

/**
 * Fixed-window rate limiter shared by all server instances (table bakery_rate_limits, db/006-rate-limits.sql).
 * Keys are hashed, so client IPs are not stored. If the database is unavailable it falls back to the
 * per-instance memory limiter, so forms keep working.
 */
export const rateLimiter = {
  async check(identifier: string, limit: number, windowMs: number): Promise<boolean> {
    try {
      const sql = database()
      const key = createHash('sha256').update(identifier).digest('base64url')
      const [row] = await sql`
        INSERT INTO bakery_rate_limits AS r (key, count, reset_at)
        VALUES (${key}, 1, now() + make_interval(secs => ${windowMs / 1000}))
        ON CONFLICT (key) DO UPDATE SET
          count = CASE WHEN r.reset_at <= now() THEN 1 ELSE r.count + 1 END,
          reset_at = CASE WHEN r.reset_at <= now() THEN EXCLUDED.reset_at ELSE r.reset_at END
        RETURNING count`
      // Expired windows are cleared now and then instead of on a timer (serverless instances sleep).
      if (Math.random() < 0.01) void sql`DELETE FROM bakery_rate_limits WHERE reset_at < now()`.catch(() => {})
      return row.count <= limit
    } catch (error) {
      if (!warnedFallback) console.error('Shared rate limit unavailable, using per-instance limit', error)
      warnedFallback = true
      return memoryLimiter.check(identifier, limit, windowMs)
    }
  },
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
