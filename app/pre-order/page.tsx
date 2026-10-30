import { SITE } from '@/lib/site-info'
import { getActiveCampaign } from '@/lib/campaigns'
import { storeDate } from '@/lib/occasion-dates'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { PreOrderForm } from '@/components/pre-order-form'
import { CampaignPreview } from '@/components/campaign-preview'
import { pageMetadata } from '@/lib/seo'
import { PageBand } from '@/components/page-band'
// Strict nonce CSP (middleware.ts) requires rendering per request.
export const dynamic = 'force-dynamic'
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const query = await searchParams
  return { ...pageMetadata('/pre-order'), ...(query.preview ? { robots: { index: false, follow: false } } : {}) }
}
export default async function PreOrderPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const query = await searchParams
  let storageUnavailable = false
  const campaign = query.preview
    ? null
    : await getActiveCampaign().catch(() => {
        storageUnavailable = true
        return null
      })
  return (
    <div className="min-h-screen">
      <Navigation />
      <main id="main-content" tabIndex={-1}>
        {query.preview ? (
          <div className="pt-16 md:pt-24">
            <CampaignPreview id={query.preview} today={storeDate()} />
          </div>
        ) : campaign ? (
          <div className="pt-16 md:pt-24">
            <PreOrderForm campaign={campaign} today={storeDate()} />
          </div>
        ) : (
          <PageBand id="preorder-title" title="Festival pre-orders">
            <p>
              {storageUnavailable ? 'Online reservations are paused for now. ' : 'No festival pre-orders right now. '}
              <a href={SITE.phoneHref} className="font-semibold text-white underline underline-offset-4">
                Call {SITE.phone}
              </a>
              {storageUnavailable ? ' for availability and reservations' : ' for today’s fresh bakes'}
            </p>
          </PageBand>
        )}
      </main>
      <div className={campaign?.items.length ? 'pb-28 md:pb-0' : ''}>
        <Footer />
      </div>
    </div>
  )
}
