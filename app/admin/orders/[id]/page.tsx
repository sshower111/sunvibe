import { AdminOrderReview } from '@/components/admin-order-review'

// One order: opened from a notification or from the orders list.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AdminOrderReview id={(await params).id} />
}
