import { redirect } from 'next/navigation'
import { adminHome } from '@/lib/admin-nav'

// middleware.ts normally redirects /admin first; this covers anything that reaches the page.
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  redirect(adminHome((await searchParams).tab))
}
