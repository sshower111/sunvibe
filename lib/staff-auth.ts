import 'server-only'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { isAdminPassword, isAdminRequest } from './admin-auth'

/**
 * Staff sign-in for the pickup screen (/pickup/<id>, opened by scanning a customer's pickup QR code). It is not an
 * admin sign-in: a staff session can only open the order whose code was scanned and confirm its pickup or delivery
 * (app/api/staff/pickup/route.ts). Every /api/admin endpoint still rejects it.
 *
 * Password: STAFF_PASSWORD (Vercel env), one shared password for the bakery's workers. The admin password also
 * works here and gives the same limited session. Sessions last 90 days and are renewed whenever the phone uses them,
 * so a worker signs in once. Changing STAFF_PASSWORD signs every staff phone out.
 */
export const STAFF_COOKIE = 'sunville_staff'
const SESSION_SECONDS = 90 * 24 * 60 * 60
const RENEW_AFTER_SECONDS = 24 * 60 * 60

const digest = (value: string) => createHash('sha256').update(value).digest()
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b))

export function isStaffPassword(password: unknown) {
  if (typeof password !== 'string' || !password) return false
  const staff = process.env.STAFF_PASSWORD
  return (!!staff && same(password, staff)) || isAdminPassword(password)
}

// Keyed by the staff password (and the admin password, which also signs in here).
function signingKey() {
  const staff = process.env.STAFF_PASSWORD
  const admin = process.env.ADMIN_PASSWORD
  if (!staff && !admin) return null
  return digest(`sunville-staff-session:${process.env.ADMIN_SESSION_SECRET || ''}:${staff || ''}:${admin || ''}`)
}
function sign(expires: number) {
  const key = signingKey()
  return key
    ? `${expires}.${createHmac('sha256', key)
        .update('staff:' + expires)
        .digest('base64url')}`
    : null
}

export function createStaffSessionToken() {
  const token = sign(Math.floor(Date.now() / 1000) + SESSION_SECONDS)
  if (!token) throw new Error('Staff password not configured')
  return { token, maxAge: SESSION_SECONDS }
}

export function isValidStaffSession(token: string | undefined) {
  if (!token) return false
  const expires = Number(token.split('.')[0])
  if (!Number.isFinite(expires) || expires < Date.now() / 1000) return false
  const expected = sign(expires)
  return !!expected && same(token, expected)
}

/** A fresh 90-day token when the session is more than a day old, otherwise null. */
export function renewedStaffSession(token: string | undefined) {
  if (!isValidStaffSession(token)) return null
  const left = Number(token!.split('.')[0]) - Date.now() / 1000
  return left < SESSION_SECONDS - RENEW_AFTER_SECONDS ? createStaffSessionToken() : null
}

function readCookie(request: Request, name: string) {
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const at = part.indexOf('=')
    if (at > 0 && part.slice(0, at).trim() === name) {
      try {
        return decodeURIComponent(part.slice(at + 1).trim())
      } catch {
        return undefined
      }
    }
  }
  return undefined
}
export const staffToken = (request: Request) => readCookie(request, STAFF_COOKIE)

/** Who may use the pickup screen: a staff phone, or a signed-in admin. */
export function pickupRole(request: Request): 'staff' | 'admin' | null {
  if (isAdminRequest(request)) return 'admin'
  return isValidStaffSession(staffToken(request)) ? 'staff' : null
}

export const staffCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // the pickup page is opened from the phone camera
  path: '/',
  maxAge,
})
