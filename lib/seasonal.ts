/**
 * OWNER: Manage banners in Admin > Banners and Save banners (no redeploy).
 * This array seeds an empty store only. Alternatively, before first admin save,
 * copy an entry, give it a unique id, fill in the
 * copy/link, set inclusive YYYY-MM-DD dates, and redeploy. Dates use Las Vegas
 * time (America/Los_Angeles). First matching entry wins. Complete the TODO
 * placeholders before their scheduled dates; they are not finished campaigns.
 *
 * STRIPE GIFT BOX CHECKLIST (Dashboard > Product catalog > Add product):
 * - Name: Mooncake Gift Box (4-pack)
 * - Metadata: key "category", value "Traditional Pastries & Mooncakes"
 * - Price: enter the actual approved USD price (one-time/default price)
 * - Description: enter the actual contents and ordering details
 * - Photo: upload the actual gift-box photo
 * - Save, copy its Stripe product ID (prod_...), then add productId to the
 *   Mid-Autumn entry below and redeploy. No product or price is invented here.
 */
export type SeasonalBannerConfig = {
  id: string
  headline: string
  message: string
  ctaLabel: string
  ctaHref: string
  startsAt: string
  endsAt: string
  enabled?: boolean
  productId?: string
}

export const SEASONAL_BANNERS: SeasonalBannerConfig[] = [
  {
    id: 'mid-autumn-2026',
    headline: 'Fresh mooncakes for Mid-Autumn Festival — this Friday.',
    message: 'Pineapple, red bean & lotus — baked fresh. Call to reserve yours.',
    ctaLabel: 'Call (702) 889-9887',
    ctaHref: 'tel:+17028899887',
    startsAt: '2026-09-24',
    endsAt: '2026-09-25',
    // productId: paste the real Stripe product ID here after completing the checklist.
  },
  {
    id: 'christmas-2026',
    enabled: false,
    headline: 'TODO: Christmas headline',
    message: 'TODO: Christmas message',
    ctaLabel: 'TODO: Christmas CTA',
    ctaHref: '#', // TODO: owner-approved destination
    startsAt: '2026-12-01',
    endsAt: '2026-12-25',
  },
  {
    id: 'lunar-new-year-2027',
    enabled: false,
    headline: 'TODO: Lunar New Year headline',
    message: 'TODO: Lunar New Year message',
    ctaLabel: 'TODO: Lunar New Year CTA',
    ctaHref: '#', // TODO: owner-approved destination
    startsAt: '2027-01-25',
    endsAt: '2027-02-06',
  },
]

export function getActiveBanner(now = new Date(), banners = SEASONAL_BANNERS): SeasonalBannerConfig | null {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find(value => value.type === type)!.value
  const today = [part('year'), part('month'), part('day')].join('-')
  return banners.find(banner => banner.enabled !== false && banner.startsAt <= today && today <= banner.endsAt) ?? null
}
