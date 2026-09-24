import type { Metadata } from 'next'
export const SITE_URL = 'https://sunvillebakerylv.com'
export const publicPages = {
  '/privacy': { title: 'Privacy Notice', description: 'How Sunville Bakery handles inquiry information, spam protection, and website measurement.' },
  '/': { title: 'Asian Bakery & Custom Cakes in Las Vegas', description: 'Visit Sunville Bakery in Las Vegas for fresh sweet and savory buns, chiffon cakes, and custom celebration cakes. Family-owned since 2002.' },
  '/menu': { title: 'Fresh Buns & Pastries Menu in Las Vegas', description: 'Explore Sunville Bakery’s savory buns, sweet buns, rolls, and specialty pastries in Las Vegas. Call to confirm availability and same-day pickup.' },
  '/custom-cakes': { title: 'Custom Celebration Cakes in Las Vegas', description: 'Explore chiffon cake sizes, flavors, and prices at Sunville Bakery in Las Vegas. Request a birthday, wedding, or anniversary cake with 3–5 days’ notice.' },
  '/gallery': { title: 'Las Vegas Bakery Photo Gallery', description: 'Explore photos of Sunville Bakery’s breads, pastries, and baked goods in Las Vegas, then browse our menu or inquire about a custom cake.' },
  '/contact': { title: 'Contact & Visit Sunville Bakery in Las Vegas', description: 'Find Sunville Bakery at 4053 Spring Mountain Road, Las Vegas, NV 89102. Check opening hours, get directions, or call 702-889-9887.' },
} as const
export type PublicPath = keyof typeof publicPages
export function pageMetadata(path: PublicPath): Metadata {
  const page = publicPages[path]
  const title = page.title + ' | Sunville Bakery'
  const images = [{ url: '/og', width: 1200, height: 630, alt: 'Sunville Bakery — fresh buns and custom cakes in Las Vegas' }]
  return { title: { absolute: title }, description: page.description, alternates: { canonical: SITE_URL + path },
    openGraph: { title, description: page.description, url: SITE_URL + path, siteName: 'Sunville Bakery', locale: 'en_US', type: 'website', images },
    twitter: { card: 'summary_large_image', title, description: page.description, images },
  }
}
export const bakerySchema = {
  '@context': 'https://schema.org', '@type': 'Bakery', '@id': SITE_URL + '/#bakery',
  name: 'Sunville Bakery', url: SITE_URL, image: SITE_URL + '/background2.jpg', logo: SITE_URL + '/sitelogo.png',
  // Coordinates verified against the bakery's Waze listing (2026-09-23).
  geo: { '@type': 'GeoCoordinates', latitude: 36.1261111, longitude: -115.1938889 },
  telephone: '+1-702-889-9887', priceRange: '$$', servesCuisine: ['Asian', 'Chinese'], hasMenu: SITE_URL + '/menu',
  address: { '@type': 'PostalAddress', streetAddress: '4053 Spring Mountain Rd', addressLocality: 'Las Vegas', addressRegion: 'NV', postalCode: '89102', addressCountry: 'US' },
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Thursday','Friday','Saturday','Sunday'], opens: '08:00', closes: '20:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Wednesday', opens: '08:00', closes: '15:00' },
  ],
}
