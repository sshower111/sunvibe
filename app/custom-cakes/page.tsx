import { pageMetadata } from '@/lib/seo'
import { CakeStructuredData } from '@/components/cake-structured-data'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { buttonVariants } from '@/components/ui/button'
import { CakeInquiryForm } from '@/components/cake-inquiry-form'
import { CakeServingGuide } from '@/components/cake-serving-guide'
import { earliestCakeDate } from '@/lib/cake-inquiry'

export const metadata = pageMetadata('/custom-cakes')
export default function CustomCakesPage() {
  return <div className="min-h-screen bg-background">
    <CakeStructuredData />
    <Navigation />
    <main id="main-content" tabIndex={-1}>
    <section className="page-space border-b bg-secondary" aria-labelledby="cake-heading">
      <div className="site-container">
        <h1 id="cake-heading" className="heading-1">Custom celebration cakes in Las Vegas</h1>
        <p className="mt-4 text-lg text-muted-foreground">Chiffon cakes for birthdays, weddings, and everything worth celebrating.</p>
        <p className="mt-3 text-sm font-semibold">Please allow 3–5 days’ notice.</p>
        <div className="mt-6 flex flex-wrap gap-3"><a href="#cake-inquiry" className={buttonVariants()}>Start an inquiry <ArrowRight aria-hidden="true" /></a><a href="#serving-guide" className={buttonVariants({ variant: 'outline' })}>Sizes & prices</a></div>
      </div>
    </section>
    <CakeServingGuide />
    <section id="cake-inquiry" className="site-container section-space" aria-labelledby="inquiry-heading"><div className="grid items-start gap-8 lg:grid-cols-[0.7fr_1.3fr]"><div><h2 id="inquiry-heading" className="heading-2">Plan your cake</h2><ol aria-label="How it works" className="mt-5 space-y-3 text-sm"><li>1. Share your ideas.</li><li>2. Confirm your design & quote.</li><li>3. Arrange pickup or delivery.</li></ol><Link href="/gallery" className="mt-5 inline-flex min-h-12 items-center text-primary underline underline-offset-4">Browse our gallery</Link><div><a href="tel:+17028899887" className="inline-flex min-h-12 items-center text-primary underline underline-offset-4">Call 702-889-9887</a></div></div><CakeInquiryForm minDate={earliestCakeDate()} /></div></section>
    </main>
    <Footer />
  </div>
}
