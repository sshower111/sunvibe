import 'server-only'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

// Admin auth: the password is typed once at login and exchanged for an httpOnly,
// signed session cookie. The password is never stored in the browser.
export const ADMIN_COOKIE = 'sunville_admin'
const SESSION_SECONDS = 12 * 60 * 60

function same(a: string, b: string) {
 return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())
}
export function isOccasionAdmin(password: unknown) {
 const expected = process.env.ADMIN_PASSWORD
 return !!expected && typeof password === 'string' && password.length > 0 && same(password, expected)
}
// Keyed by the admin password, so changing ADMIN_PASSWORD signs everyone out.
function signingKey() {
 const password = process.env.ADMIN_PASSWORD
 if (!password) return null
 return createHash('sha256').update('sunville-admin-session:' + (process.env.ADMIN_SESSION_SECRET || '') + ':' + password).digest()
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
export function isValidAdminSession(token: string | undefined) {
 if (!token) return false
 const expires = Number(token.split('.')[0])
 if (!Number.isFinite(expires) || expires < Date.now() / 1000) return false
 const expected = sign(expires)
 return !!expected && same(token, expected)
}
export async function hasAdminSession() {
 return isValidAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)
}
/** Accepts the session cookie (normal case) or the password (scripts/tests). */
export async function isAdminRequest(password?: unknown) {
 return isOccasionAdmin(password) || await hasAdminSession()
}
export const adminCookieOptions = (maxAge: number) => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/', maxAge })
