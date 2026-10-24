import type { Metadata } from 'next'
// Strict nonce CSP (middleware.ts) requires rendering per request.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false }, alternates: { canonical: null } }
export default function Layout({ children }: { children: React.ReactNode }) {
  // data-admin-ui switches every button on the admin pages to the flat text style (app/globals.css).
  return <div data-admin-ui>{children}</div>
}
