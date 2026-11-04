// Home Screen app for bakery workers ("Sunville 取貨"): opens straight to the pickup QR scanner (/employee).
export const dynamic = 'force-static'

export function GET() {
  return Response.json(
    {
      name: 'Sunville 取貨',
      short_name: 'Sunville 取貨',
      id: '/employee',
      start_url: '/employee',
      scope: '/employee',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#ffffff',
      icons: [
        { src: '/admin-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/admin-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } },
  )
}
