// Service worker for the admin Home Screen app. It caches nothing (admin data must always be fresh). It shows push
// notifications (lib/push.ts) and, when one is tapped, opens its page, e.g. /admin/orders/<id>.
// Served from /admin/sw.js with Service-Worker-Allowed so its scope can be "/admin" (which also covers /admin itself).
export const dynamic = 'force-static'

const script = `
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Sunville Admin', {
      body: data.body || '',
      tag: data.tag,
      icon: '/admin-icon-192.png',
      badge: '/admin-icon-192.png',
      data: { url: data.url },
    }),
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const path = event.notification.data && event.notification.data.url
  // Only ever open admin pages on this site.
  const url = new URL(typeof path === 'string' && path.startsWith('/admin') ? path : '/admin/orders', self.location.origin).href
  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of open) {
        try {
          await client.focus()
          await client.navigate(url)
          return
        } catch (e) {}
      }
      await self.clients.openWindow(url)
    })(),
  )
})
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
