// Admin sections and their addresses. Phones show the four main tabs in a bottom bar; the rest sit under More.

export type AdminSection =
  'orders' | 'inquiries' | 'menu' | 'gallery' | 'photos' | 'occasions' | 'pre-orders' | 'settings' | 'more'

export const ADMIN_SECTIONS: { id: Exclude<AdminSection, 'more'>; label: string; main: boolean }[] = [
  { id: 'orders', label: 'Cake orders', main: true },
  { id: 'inquiries', label: 'Cake inquiries', main: true },
  { id: 'menu', label: 'Menu', main: true },
  { id: 'gallery', label: 'Gallery', main: false },
  { id: 'photos', label: 'Customer photos', main: false },
  { id: 'occasions', label: 'Occasions', main: false },
  { id: 'pre-orders', label: 'Pre-orders', main: false },
  { id: 'settings', label: 'Settings', main: false },
]

export const adminPath = (section: AdminSection) => `/admin/${section}`

/** The section a path belongs to (/admin/orders/123 → orders), or null for /admin itself. */
export function sectionOf(pathname: string): AdminSection | null {
  const first = pathname.replace(/^\/admin\/?/, '').split('/')[0]
  return first === 'more' || ADMIN_SECTIONS.some(s => s.id === first) ? (first as AdminSection) : null
}

/** Bottom-bar tab that is lit for a section: the extra sections light up More. */
export const bottomTabOf = (section: AdminSection | null): AdminSection =>
  section === null ? 'orders' : ADMIN_SECTIONS.find(s => s.id === section)?.main === false ? 'more' : section

// Old addresses (/admin?tab=cake-orders) are still in sent emails and bookmarks.
const LEGACY_TABS: Record<string, AdminSection> = {
  'cake-orders': 'orders',
  'cake-inquiries': 'inquiries',
  menu: 'menu',
  gallery: 'gallery',
  occasions: 'occasions',
  'pre-orders': 'pre-orders',
  settings: 'settings',
}
/** Where /admin sends you: the old ?tab= value if there is one, otherwise Cake orders. */
export const adminHome = (tab?: string | string[]) =>
  adminPath((typeof tab === 'string' && LEGACY_TABS[tab]) || 'orders')
