import type { Metadata, Viewport } from 'next'
import { StaffEmployee } from '@/components/staff-employee'

// The employee app: sign in once, then scan customers' pickup QR codes with the built-in scanner.
// Add to the iPhone Home Screen from Safari (Share → Add to Home Screen) as "Sunville 取貨".
// Strict nonce CSP (middleware.ts) requires rendering per request.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Sunville 取貨',
  robots: { index: false, follow: false },
  manifest: '/employee/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Sunville 取貨', statusBarStyle: 'default' },
  icons: { apple: '/admin-icon-180.png' },
}
export const viewport: Viewport = { viewportFit: 'cover', themeColor: '#ffffff' }

export default function Page() {
  return <StaffEmployee />
}
