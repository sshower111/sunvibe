import { NextRequest, NextResponse } from 'next/server'

// Pages with forms, CAPTCHA or admin tools keep a strict per-request nonce policy (rendered on every request).
// Read-only pages (home, menu, gallery, privacy) use a fixed policy so they can be cached and served
// from Vercel's CDN instead of being rebuilt by a server function on every visit.
const STRICT_PREFIXES = ['/admin', '/contact', '/custom-cakes', '/pre-order', '/checkout']
const isStrict = (pathname: string) => STRICT_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'))

function policy(scriptSources: string, development: boolean) {
  return [
    "default-src 'self'",
    `script-src 'self' ${scriptSources} https://challenges.cloudflare.com https://va.vercel-scripts.com ${development ? "'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' https://challenges.cloudflare.com https://vitals.vercel-insights.com https://va.vercel-scripts.com ${development ? 'ws://127.0.0.1:* ws://localhost:*' : ''}`,
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(!development ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}

export function middleware(request: NextRequest) {
  const development = process.env.NODE_ENV !== 'production'
  if (!isStrict(request.nextUrl.pathname)) {
    const response = NextResponse.next()
    response.headers.set('Content-Security-Policy', policy("'unsafe-inline'", development))
    return response
  }
  const nonce = btoa(crypto.randomUUID())
  const strict = policy(`'nonce-${nonce}' 'strict-dynamic'`, development)
  const headers = new Headers(request.headers)
  headers.set('x-nonce', nonce)
  headers.set('Content-Security-Policy', strict)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('Content-Security-Policy', strict)
  // Nonced HTML must never be shared between requests by a cache.
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)'],
}
