import 'server-only'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

/**
 * Admin authentication. The password is entered once at sign-in and exchanged for an
 * httpOnly, HMAC-signed session cookie; the password itself is never stored in the browser.
 */
export const ADMIN_COOKIE = 'sunville_admin'
const SESSION_SECONDS = 12 * 60 * 60

function same(a: string, b: string) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())
}
/** True when the value matches ADMIN_PASSWORD (compared in constant time). */
export function isAdminPassword(password: unknown) {
  const expected = process.env.ADMIN_PASSWORD
  return !!expected && typeof password === 'string' && password.length > 0 && same(password, expected)
}
// Keyed by the admin password, so changing ADMIN_PASSWORD signs everyone out.
function signingKey() {
  const password = process.env.ADMIN_PASSWORD
  if (!password) return null
  return createHash('sha256')
    .update('sunville-admin-session:' + (process.env.ADMIN_SESSION_SECRET || '') + ':' + password)
    .digest()
}
function sign(expires: number) {
  const key = signingKey()
  return key ? expires + '.' + createHmac('sha256', key).update(String(expires)).digest('base64url') : null
}
export function createAdminSessionToken() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS
  const token = sign(expires)
  if (!token) throw new Error('Admin password not configured')
  return { token, maxAge: SESSION_SECONDS }
}
function isValidAdminSession(token: string | undefined) {
  if (!token) return false
  const expires = Number(token.split('.')[0])
  if (!Number.isFinite(expires) || expires < Date.now() / 1000) return false
  const expected = sign(expires)
  return !!expected && same(token, expected)
}
export async function hasAdminSession() {
  return isValidAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)
}
/** Reads one cookie from a request's Cookie header. */
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
/**
 * True when the request carries a valid admin session cookie. The password is accepted only at sign-in
 * (/api/admin/verify, which is rate limited), so other admin endpoints can't be used to guess it.
 */
export function isAdminRequest(request: Request) {
  return isValidAdminSession(readCookie(request, ADMIN_COOKIE))
}
export const adminCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge,
})
