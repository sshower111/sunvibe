import type React from "react"
import type { Metadata } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { CartProvider } from "@/contexts/cart-context"
import { MaintenanceCheck } from "@/components/maintenance-check"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Sunville Bakery - Fresh Asian Bakery in Las Vegas | Roll Cakes, Buns & Pastries",
    template: "%s | Sunville Bakery"
  },
  description: "Sunville Bakery offers fresh Asian baked goods in Las Vegas. Order online for pickup: Japanese roll cakes, Chinese buns, traditional pastries, sponge cakes & artisan breads. Open daily.",
  keywords: ["Asian bakery Las Vegas", "Japanese roll cake", "Chinese buns", "bakery near me", "fresh pastries Las Vegas", "Asian baked goods", "mooncakes", "sponge cakes", "online bakery ordering"],
  authors: [{ name: "Sunville Bakery" }],
  creator: "Sunville Bakery",
  publisher: "Sunville Bakery",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://sunville-bakery.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Sunville Bakery',
    title: 'Sunville Bakery - Fresh Asian Bakery in Las Vegas',
    description: 'Order fresh Asian baked goods online for pickup. Japanese roll cakes, Chinese buns, traditional pastries & more. Las Vegas bakery open daily.',
    images: [
      {
        url: '/sitelogo.png',
        width: 1200,
        height: 630,
        alt: 'Sunville Bakery Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sunville Bakery - Fresh Asian Bakery in Las Vegas',
    description: 'Order fresh Asian baked goods online for pickup. Japanese roll cakes, Chinese buns, traditional pastries & more.',
    images: ['/sitelogo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes here later
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
}

export default function RootLayout({
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
        {/* Chatbase AI Widget */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
window.embeddedChatbotConfig = {
chatbotId: "uPyP6VyjYrGcYs9Mz0f3V",
domain: "www.chatbase.co",
buttonPosition: "right"
}
    `
          }}
        />
        <script
          src="https://www.chatbase.co/embed.min.js"
          data-chatbot-id="uPyP6VyjYrGcYs9Mz0f3V"
          data-domain="www.chatbase.co"
          defer
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Bakery",
              "name": "Sunville Bakery",
              "description": "Fresh Asian bakery specializing in Japanese roll cakes, Chinese buns, and traditional pastries",
              "url": process.env.NEXT_PUBLIC_SITE_URL || "https://sunville-bakery.vercel.app",
              "logo": `${process.env.NEXT_PUBLIC_SITE_URL || "https://sunville-bakery.vercel.app"}/sitelogo.png`,
              "image": `${process.env.NEXT_PUBLIC_SITE_URL || "https://sunville-bakery.vercel.app"}/sitelogo.png`,
              "telephone": "+1-702-889-9887",
              "priceRange": "$$",
              "servesCuisine": ["Asian", "Japanese", "Chinese"],
              "menu": `${process.env.NEXT_PUBLIC_SITE_URL || "https://sunville-bakery.vercel.app"}/menu`,
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Las Vegas",
                "addressRegion": "NV",
                "addressCountry": "US"
              },
              "openingHoursSpecification": [
                {
                  "@type": "OpeningHoursSpecification",
                  "dayOfWeek": ["Monday", "Tuesday", "Thursday", "Friday", "Saturday", "Sunday"],
                  "opens": "08:00",
                  "closes": "20:00"
                },
                {
                  "@type": "OpeningHoursSpecification",
                  "dayOfWeek": "Wednesday",
                  "opens": "08:00",
                  "closes": "15:00"
                }
              ],
              "paymentAccepted": ["Credit Card", "Debit Card"],
              "currenciesAccepted": "USD"
            })
          }}
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        <CartProvider>
          <MaintenanceCheck>
            {children}
          </MaintenanceCheck>
          <Analytics />
        </CartProvider>
      </body>
    </html>
  )
}
