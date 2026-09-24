import { cakeCatalog } from '@/lib/cake-catalog'
import { SITE_URL } from '@/lib/seo'
import { StructuredData } from '@/components/structured-data'
export function CakeStructuredData() {
  return <StructuredData data={{ '@context': 'https://schema.org', '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Custom cakes', item: SITE_URL + '/custom-cakes' },
    ] },
    { '@type': 'ItemList', name: 'Custom cake sizes and guide prices', itemListElement: cakeCatalog.map((cake, i) => ({
      '@type': 'ListItem', position: i + 1, item: {
        '@type': 'Product', '@id': SITE_URL + '/custom-cakes#' + cake.value,
        name: cake.label + ' celebration cake', category: cake.category, brand: { '@type': 'Brand', name: 'Sunville Bakery' },
        description: 'Made to order in Las Vegas with 3–5 days’ notice. Guide prices; final quote depends on design, filling, and delivery.',
        offers: cake.prices.length === 1 ? {
          '@type': 'Offer', price: cake.prices[0], priceCurrency: 'USD', url: SITE_URL + '/custom-cakes#serving-guide', seller: { '@id': SITE_URL + '/#bakery' },
        } : {
          '@type': 'AggregateOffer', lowPrice: Math.min(...cake.prices), highPrice: Math.max(...cake.prices), priceCurrency: 'USD', url: SITE_URL + '/custom-cakes#serving-guide', seller: { '@id': SITE_URL + '/#bakery' },
        },
      },
    })) },
  ] }} />
}
