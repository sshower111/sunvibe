import { pageMetadata } from '@/lib/seo'
import { squareClientConfig } from '@/lib/square'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { CakeOrderFlow } from '@/components/cake-order-flow'
import { CakeStructuredData } from '@/components/cake-structured-data'
// Strict nonce CSP (middleware.ts) requires rendering per request.
export const dynamic = 'force-dynamic'
export const metadata = pageMetadata('/order-cake')

// Everyday and custom cakes are ordered through one questionnaire that fills the screen.
export default function OrderCakePage() {
  return (
    <div className="min-h-screen bg-surface-soft">
      <CakeStructuredData />
      <Navigation />
      <main id="main-content" tabIndex={-1} className="site-container pt-[calc(var(--header-height)+1rem)] pb-6">
        <h1 className="sr-only">Order a cake</h1>
        <CakeOrderFlow square={squareClientConfig()} />
      </main>
      <Footer />
    </div>
  )
}
