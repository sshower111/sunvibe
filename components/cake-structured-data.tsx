import { cakeCatalog } from '@/lib/cake-catalog'
import { ORDER_SIZES } from '@/lib/cake-order'
import { SITE_URL } from '@/lib/seo'
import { StructuredData } from '@/components/structured-data'
export function CakeStructuredData() {
  return (
    <StructuredData
      data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: 'Order a cake', item: SITE_URL + '/order-cake' },
            ],
          },
          {
            '@type': 'ItemList',
            name: 'Chiffon cakes to order online',
            itemListElement: cakeCatalog
              .filter(cake => (ORDER_SIZES as readonly string[]).includes(cake.value))
              .map((cake, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: {
                  '@type': 'Product',
                  '@id': SITE_URL + '/order-cake#' + cake.value,
                  name: cake.label + ' celebration cake',
                  category: cake.category,
                  brand: { '@type': 'Brand', name: 'Sunville Bakery' },
                  description:
                    'Chiffon cake made in Las Vegas with your choice of flavor and filling, for pickup. Price depends on the filling.',
                  offers:
                    cake.prices.length === 1
                      ? {
                          '@type': 'Offer',
                          price: cake.prices[0],
                          priceCurrency: 'USD',
                          url: SITE_URL + '/order-cake?size=' + cake.value,
                          seller: { '@id': SITE_URL + '/#bakery' },
                        }
                      : {
                          '@type': 'AggregateOffer',
                          lowPrice: Math.min(...cake.prices),
                          highPrice: Math.max(...cake.prices),
                          priceCurrency: 'USD',
                          url: SITE_URL + '/order-cake?size=' + cake.value,
                          seller: { '@id': SITE_URL + '/#bakery' },
                        },
                },
              })),
          },
        ],
      }}
    />
  )
}
