// Home Screen app for the admin pages ("Sunville Admin"). Scoped to /admin so the public site stays a normal website.
export const dynamic = 'force-static'

export function GET() {
  return Response.json(
    {
      name: 'Sunville Admin',
      short_name: 'Sunville Admin',
      id: '/admin',
      start_url: '/admin/orders',
      scope: '/admin',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#a3201c',
      icons: [
        { src: '/admin-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/admin-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } },
  )
}
