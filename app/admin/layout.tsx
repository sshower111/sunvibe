import type { Metadata } from 'next'
// Strict nonce CSP (middleware.ts) requires rendering per request.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false }, alternates: { canonical: null } }
export default function Layout({ children }: { children: React.ReactNode }) { return children }
