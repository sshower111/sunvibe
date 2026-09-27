import { SiteSeasonalBanner } from '@/components/site-seasonal-banner'
import { getActiveCampaign } from '@/lib/campaigns'
import { campaignBanner } from '@/lib/seasonal'
import { SITE_URL, pageMetadata, bakerySchema } from "@/lib/seo"
import { StructuredData } from "@/components/structured-data"
import type React from "react"
import type { Metadata } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { SiteProvider } from "@/components/site-context"
import { MaintenanceCheck } from "@/components/maintenance-check"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
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
        <link rel="icon" href="/sitelogo.png" />
        <link rel="apple-touch-icon" href="/sitelogo.png" />
        <meta name="theme-color" content="#000000" />
        <StructuredData data={bakerySchema} />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        <SiteSeasonalBanner banner={campaignBanner(campaign)} />
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <SiteProvider preorderOpen={!!campaign}>
          <MaintenanceCheck isMaintenanceMode={process.env.MAINTENANCE_MODE === "true"}>
            {children}
          </MaintenanceCheck>
          <Analytics />
          <SpeedInsights />
        </SiteProvider>
      </body>
    </html>
  )
}
