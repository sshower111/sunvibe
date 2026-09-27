import { pageMetadata, SITE_URL } from '@/lib/seo'
import { StructuredData } from '@/components/structured-data'
// Strict nonce CSP (middleware.ts) requires rendering per request.
export const dynamic = 'force-dynamic'
export const metadata = pageMetadata('/contact')
export default function Layout({ children }: { children: React.ReactNode }) {
  return <><StructuredData data={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Contact', item: SITE_URL + '/contact' },
  ] }} />{children}</>
}
