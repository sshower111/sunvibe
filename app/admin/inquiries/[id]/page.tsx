import { AdminCakeInquiries } from '@/components/admin-cake-inquiries'

// Opened from a notification: the inquiries list, scrolled to this inquiry and highlighted.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AdminCakeInquiries focusId={(await params).id} />
}
