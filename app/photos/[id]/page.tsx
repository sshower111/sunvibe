import type { Metadata } from 'next'
import { getCakeOrder } from '@/lib/cake-orders-store'
import { acceptsPhotos } from '@/lib/thank-you'
import { CustomerPhotosForm } from '@/components/customer-photos-form'

// "Share a photo" from the thank-you email (lib/thank-you.ts). Strict nonce CSP (middleware.ts) requires rendering
// per request.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Share a photo', robots: { index: false, follow: false } }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = /^[0-9a-f-]{36}$/i.test(id) ? await getCakeOrder(id).catch(() => null) : null
  return (
    <main className="min-h-dvh bg-white">
      <div className="mx-auto max-w-md px-5 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <img src="/logo-dark.png" alt="Sunville Bakery" width={160} height={39} className="mx-auto mb-8 h-auto w-40" />
        {order && acceptsPhotos(order) ? (
          <CustomerPhotosForm orderId={order.id} firstName={order.name.split(' ')[0]} />
        ) : (
          <p className="text-center text-lg text-muted-foreground">
            This link is no longer active. Thank you for celebrating with us!
          </p>
        )}
      </div>
    </main>
  )
}
