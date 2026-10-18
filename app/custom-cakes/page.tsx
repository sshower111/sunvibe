import { pageMetadata } from '@/lib/seo'
import { CakeStructuredData } from '@/components/cake-structured-data'
import Link from 'next/link'
import Image from 'next/image'
import { galleryImages, galleryAlt } from '@/lib/gallery-images'
import { PageBand } from '@/components/page-band'
import { cn } from '@/lib/utils'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { buttonVariants } from '@/components/ui/button'
import { CakeInquiryForm } from '@/components/cake-inquiry-form'
import { CakeServingGuide } from '@/components/cake-serving-guide'
import { earliestCakeDate } from '@/lib/cake-inquiry'
// Strict nonce CSP (middleware.ts) requires rendering per request.
export const dynamic = 'force-dynamic'

export const metadata = pageMetadata('/custom-cakes')
// Celebration cakes from the built-in gallery (tiered, floral, themed).
const cakePhotos = [0, 4, 12, 13].map(index => galleryImages[index]).filter(Boolean)
export default function CustomCakesPage() {
  return (
    <div className="min-h-screen bg-background">
      <CakeStructuredData />
      <Navigation />
      <main id="main-content" tabIndex={-1}>
        <PageBand
          id="cake-heading"
          title="Custom celebration cakes in Las Vegas"
          aside={
            <a
              href="#cake-inquiry"
              className={cn(buttonVariants(), 'w-full bg-white text-brand hover:bg-white/90 sm:w-auto')}
            >
              Start an inquiry
            </a>
          }
        >
          <p>Chiffon cakes for birthdays, weddings, and everything worth celebrating.</p>
          <p className="mt-2 text-base font-semibold text-white">Please allow 3–5 days’ notice.</p>
        </PageBand>
        <CakeServingGuide />
        <section id="cake-inquiry" className="site-container section-space" aria-labelledby="inquiry-heading">
          <div className="grid items-start gap-8 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <h2 id="inquiry-heading" className="heading-2">
                Plan your cake
              </h2>
              <div className="mt-6">
                <h3 className="heading-3 mb-3">Cakes we’ve made</h3>
                <div className="grid grid-cols-2 gap-2">
                  {cakePhotos.map(src => (
                    <Link
                      key={src}
                      href="/gallery"
                      className="relative block aspect-square overflow-hidden rounded-lg bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <Image
                        src={src}
                        alt={galleryAlt(src)}
                        fill
                        sizes="(min-width: 1024px) 160px, 45vw"
                        className="object-cover"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <CakeInquiryForm minDate={earliestCakeDate()} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
