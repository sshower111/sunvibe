import type React from "react"
import type { Metadata } from "next"
import { Montserrat, Raleway } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { CartProvider } from "@/contexts/cart-context"
import "./globals.css"

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Sunville Bakery - Authentic Asian Breads & Pastries",
  description:
    "Premium French, Chinese, and Italian breads, mouth-watering pastries, chocolate and fruit creations, and seasonal creations.",
  generator: "v0.app",
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
      </head>
      <body className={`${montserrat.variable} ${raleway.variable} font-sans`}>
        <CartProvider>
          {children}
          <Analytics />
        </CartProvider>
      </body>
    </html>
  )
}
