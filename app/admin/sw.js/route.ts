// Service worker for the admin Home Screen app. It caches nothing (admin data must always be fresh);
// it exists so the app can be installed and, later, receive push notifications.
// Served from /admin/sw.js with Service-Worker-Allowed so its scope can be "/admin" (which also covers /admin itself).
export const dynamic = 'force-static'

const script = `
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))
`

export function GET() {
  return new Response(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/admin',
      'Cache-Control': 'no-cache',
    },
  })
}
