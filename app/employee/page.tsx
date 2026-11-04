import type { Metadata } from 'next'
import { StaffEmployee } from '@/components/staff-employee'

// Signs a worker's phone in ahead of time, so their first pickup-code scan opens the order straight away.
// Strict nonce CSP (middleware.ts) requires rendering per request.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: '員工登入', robots: { index: false, follow: false } }

export default function Page() {
  return <StaffEmployee />
}
