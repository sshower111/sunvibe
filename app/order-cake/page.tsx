import { pageMetadata } from '@/lib/seo'
import { squareClientConfig } from '@/lib/square'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { PageBand } from '@/components/page-band'
import { CakeOrderFlow } from '@/components/cake-order-flow'
// Strict nonce CSP (middleware.ts) requires rendering per request.
export const dynamic = 'force-dynamic'
export const metadata = pageMetadata('/order-cake')

export default function OrderCakePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main id="main-content" tabIndex={-1}>
        <PageBand id="order-heading" title="Order a cake">
          <p>Everyday cakes paid online for pickup, or a custom design we’ll quote.</p>
          <p className="mt-2 text-base font-semibold text-white">
            Order by the night before, or same day with 3 hours’ notice.
          </p>
        </PageBand>
        <section id="cake-inquiry" className="site-container section-space">
          <CakeOrderFlow square={squareClientConfig()} />
        </section>
      </main>
      <Footer />
    </div>
  )
}
