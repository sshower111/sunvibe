import { pageMetadata, SITE_URL } from '@/lib/seo'
import { StructuredData } from '@/components/structured-data'
export const metadata = pageMetadata('/gallery')
export default function Layout({ children }: { children: React.ReactNode }) {
  return <><StructuredData data={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Gallery', item: SITE_URL + '/gallery' },
  ] }} />{children}</>
}
