import { pageMetadata } from '@/lib/seo'
import { squareClientConfig } from '@/lib/square'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { PageBand } from '@/components/page-band'
import { CakeOrderFlow } from '@/components/cake-order-flow'
import { CakeStructuredData } from '@/components/cake-structured-data'
// Strict nonce CSP (middleware.ts) requires rendering per request.
export const dynamic = 'force-dynamic'
export const metadata = pageMetadata('/order-cake')

// Checkout for menu cakes (the menu's Cakes chip links here; ?size= preselects a size). Custom cakes: /custom-cakes.
export default async function OrderCakePage({ searchParams }: { searchParams: Promise<{ size?: string }> }) {
  const { size } = await searchParams
  return (
    <div className="min-h-screen bg-background">
      <CakeStructuredData />
      <Navigation />
      <main id="main-content" tabIndex={-1}>
        <PageBand id="order-heading" title="Order a cake" />
        <section className="site-container section-space">
          <CakeOrderFlow square={squareClientConfig()} initialSize={typeof size === 'string' ? size : ''} />
        </section>
      </main>
      <Footer />
    </div>
  )
}
