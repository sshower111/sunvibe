import type { Metadata } from 'next'
import { StaffSetup } from '@/components/staff-setup'

// Staff phone setup: workers open this once (from the QR code in admin → Settings) and sign in.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: '員工設定', robots: { index: false, follow: false } }

export default function Page() {
  return <StaffSetup />
}
