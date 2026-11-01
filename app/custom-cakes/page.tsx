import Link from 'next/link'
import { pageMetadata, SITE_URL } from '@/lib/seo'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { PageBand } from '@/components/page-band'
import { StructuredData } from '@/components/structured-data'
import { CustomCakeInquiry } from '@/components/custom-cake-inquiry'
// Strict nonce CSP (middleware.ts) requires rendering per request.
export const dynamic = 'force-dynamic'
export const metadata = pageMetadata('/custom-cakes')

// Quote requests for custom, decorated and tiered cakes. Cakes to buy now are on /menu (→ /order-cake).
export default function CustomCakesPage() {
  return (
    <div className="min-h-screen bg-background">
      <StructuredData
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'Custom cakes', item: SITE_URL + '/custom-cakes' },
          ],
        }}
      />
      <Navigation />
      <main id="main-content" tabIndex={-1}>
        <PageBand id="custom-heading" title="Custom cakes">
          <p>Decorated and tiered cakes, designed for your event.</p>
        </PageBand>
        <section className="site-container section-space">
          <CustomCakeInquiry />
          <p className="mt-8 text-center text-sm">
            <Link href="/menu" className="font-semibold text-primary underline underline-offset-4">
              Need a cake sooner? Order from the menu
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
