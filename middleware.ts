import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID())
  const development = process.env.NODE_ENV !== 'production'
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com https://www.chatbase.co https://va.vercel-scripts.com ${development ? "'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' https://challenges.cloudflare.com https://www.chatbase.co https://*.chatbase.co https://vitals.vercel-insights.com https://va.vercel-scripts.com ${development ? 'ws://127.0.0.1:* ws://localhost:*' : ''}`,
    "frame-src https://challenges.cloudflare.com https://www.chatbase.co https://*.chatbase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(!development ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
  const headers = new Headers(request.headers)
  headers.set('x-nonce', nonce)
  headers.set('Content-Security-Policy', policy)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('Content-Security-Policy', policy)
  // Nonced HTML must never be shared between requests by a cache.
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)'],
}
