import { AdminPickup } from '@/components/admin-pickup'

// Opened by scanning the pickup QR code in the customer's confirmation email (lib/pickup-qr.ts).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AdminPickup id={(await params).id} />
}
