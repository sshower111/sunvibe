import { redirect } from 'next/navigation'

// Opened from a notification: the inquiries list with this inquiry open in the side panel.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  redirect('/admin/inquiries?open=' + encodeURIComponent((await params).id))
}
