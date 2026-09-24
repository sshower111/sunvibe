import { pageMetadata, SITE_URL } from '@/lib/seo'
import { StructuredData } from '@/components/structured-data'
export const metadata = pageMetadata('/menu')
export default function Layout({ children }: { children: React.ReactNode }) {
  return <><StructuredData data={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Menu', item: SITE_URL + '/menu' },
  ] }} />{children}</>
}
