import { SeasonalBanner } from '@/components/seasonal-banner'
import { getActiveCampaign } from '@/lib/campaigns'
import { campaignBanner } from '@/lib/seasonal'
import { SITE_URL, pageMetadata, bakerySchema } from '@/lib/seo'
import { StructuredData } from '@/components/structured-data'
import type React from 'react'
import type { Metadata } from 'next'
import { Figtree, Noto_Serif_HK, Young_Serif } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { SiteProvider } from '@/components/site-context'
import './globals.css'

const body = Figtree({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const display = Young_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
})

// Only used for Chinese item names; the browser downloads just the characters a page shows.
const han = Noto_Serif_HK({
  weight: '900',
  variable: '--font-han-serif',
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...pageMetadata('/'),
  robots: { index: true, follow: true },
}

// Public pages are cached and rebuilt at most every 15 minutes (or right after an admin edit),
// so a campaign's start/end date still takes effect on time.
export const revalidate = 900

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Fail closed on storage outages so disabled campaigns cannot reappear.
  const campaign = await getActiveCampaign().catch(() => null)
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo-mark.png" />
        <link rel="apple-touch-icon" href="/logo-mark.png" />
        <meta name="theme-color" content="#a3201c" />
        <StructuredData data={bakerySchema} />
      </head>
      <body className={`${body.variable} ${display.variable} ${han.variable} font-sans`}>
        <SeasonalBanner banner={campaignBanner(campaign)} />
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <SiteProvider preorderOpen={!!campaign}>
          {children}
          <Analytics />
          <SpeedInsights />
        </SiteProvider>
      </body>
    </html>
  )
}
