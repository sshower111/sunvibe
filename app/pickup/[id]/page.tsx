import type { Metadata } from 'next'
import { StaffPickup } from '@/components/staff-pickup'

// Opened by scanning the pickup QR code in a customer's confirmation email (lib/pickup-qr.ts).
// Strict nonce CSP (middleware.ts) requires rendering per request.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: '取貨', robots: { index: false, follow: false } }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <StaffPickup id={(await params).id} />
}
