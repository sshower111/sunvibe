import type { MetadataRoute } from 'next'
import { SITE_URL, publicPages } from '@/lib/seo'
export default function sitemap(): MetadataRoute.Sitemap {
  return Object.keys(publicPages).map(path => ({ url: SITE_URL + path }))
}
