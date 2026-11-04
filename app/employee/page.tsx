import type { Metadata, Viewport } from 'next'
import { StaffEmployee } from '@/components/staff-employee'

// The employee app: sign in once, then scan customers' pickup QR codes with the built-in scanner.
// Add to the iPhone Home Screen from Safari (Share → Add to Home Screen) as "Sunville QR".
// Strict nonce CSP (middleware.ts) requires rendering per request.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Sunville QR',
  robots: { index: false, follow: false },
  manifest: '/employee/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Sunville QR', statusBarStyle: 'default' },
  icons: { apple: '/admin-icon-180.png' },
}
export const viewport: Viewport = { viewportFit: 'cover', themeColor: '#ffffff' }

export default function Page() {
  return <StaffEmployee />
}
