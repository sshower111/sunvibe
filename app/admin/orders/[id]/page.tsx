import { redirect } from 'next/navigation'

// Links in notifications and emails: the orders list with this order open in the side panel.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  redirect('/admin/orders?open=' + encodeURIComponent((await params).id))
}
