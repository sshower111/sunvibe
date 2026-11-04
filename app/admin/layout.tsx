import type { Metadata, Viewport } from 'next'
import { AdminShell } from '@/components/admin-shell'

// Strict nonce CSP (middleware.ts) requires rendering per request.
export const dynamic = 'force-dynamic'
// Installable as "Sunville Admin" from Safari → Share → Add to Home Screen (manifest and service worker in this folder).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null },
  manifest: '/admin/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Sunville Admin', statusBarStyle: 'default' },
  icons: { apple: '/admin-icon-180.png' },
}
// viewport-fit=cover lets the bottom tab bar sit above the iPhone home indicator (safe-area insets).
export const viewport: Viewport = { viewportFit: 'cover', themeColor: '#f2f2f7' }

export default function Layout({ children }: { children: React.ReactNode }) {
  // data-admin-ui switches the admin pages to the Apple-style look: system font, grey grouped page, filled buttons (app/globals.css).
  return (
    <div data-admin-ui>
      <AdminShell>{children}</AdminShell>
    </div>
  )
}
