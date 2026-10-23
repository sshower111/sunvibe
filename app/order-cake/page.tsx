import Link from 'next/link'
import { pageMetadata } from '@/lib/seo'
import { SITE } from '@/lib/site-info'
import { squareClientConfig } from '@/lib/square'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { PageBand } from '@/components/page-band'
import { CakeOrderForm } from '@/components/cake-order-form'
// Strict nonce CSP (middleware.ts) requires rendering per request.
export const dynamic = 'force-dynamic'
export const metadata = pageMetadata('/order-cake')

export default function OrderCakePage() {
  const square = squareClientConfig()
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main id="main-content" tabIndex={-1}>
        <PageBand id="order-heading" title="Order a cake">
          <p>Our everyday chiffon cakes, paid online and ready for pickup.</p>
          <p className="mt-2 text-base font-semibold text-white">
            Order by the night before, or same day with 3 hours’ notice.
          </p>
        </PageBand>
        <section className="site-container section-space">
          <div className="max-w-2xl">
            <p className="mb-8 text-sm text-muted-foreground">
              Want a special design, tiers or delivery?{' '}
              <Link href="/custom-cakes" className="font-semibold text-primary underline">
                Send a custom cake inquiry
              </Link>
              .
            </p>
            {square ? (
              <CakeOrderForm square={square} />
            ) : (
              <p>
                Online cake orders are coming soon. To order now,{' '}
                <a href={SITE.phoneHref} className="font-semibold text-primary underline">
                  call {SITE.phone}
                </a>
                .
              </p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
