import { AdminCakeOrders } from '@/components/admin-cake-orders'

// Opened from a notification: the orders list, scrolled to this order and highlighted.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AdminCakeOrders focusId={(await params).id} />
}
