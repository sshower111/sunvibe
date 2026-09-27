import { CartProvider } from '@/contexts/cart-context'
import type { Metadata } from 'next'
// Strict nonce CSP (middleware.ts) requires rendering per request.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false }, alternates: { canonical: null } }
// Legacy Stripe checkout only (rollback path). The cart no longer loads on every page.
export default function Layout({ children }: { children: React.ReactNode }) { return <CartProvider>{children}</CartProvider> }
