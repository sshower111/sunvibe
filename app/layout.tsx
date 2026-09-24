import { SITE_URL, pageMetadata, bakerySchema } from "@/lib/seo"
import { StructuredData } from "@/components/structured-data"
import type React from "react"
import type { Metadata } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { CartProvider } from "@/contexts/cart-context"
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/sitelogo.png" />
        <link rel="apple-touch-icon" href="/sitelogo.png" />
        <meta name="theme-color" content="#000000" />
        <StructuredData data={bakerySchema} />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <CartProvider>
          <MaintenanceCheck isMaintenanceMode={process.env.MAINTENANCE_MODE === "true"}>
            {children}
          </MaintenanceCheck>
          <Analytics />
          <SpeedInsights />
        </CartProvider>
      </body>
    </html>
  )
}
