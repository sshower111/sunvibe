export interface MenuProduct {
  id: string
  name: string
  description: string
  price: string
  priceId: string
  image: string
  category: string
}

export function matchesMenuSearch(product: MenuProduct, query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const text = [product.name, product.description, product.category].join(' ').toLocaleLowerCase()
  return terms.every(term => text.includes(term))
}

export function getStoreStatus(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const value = (type: string) => parts.find(part => part.type === type)?.value || ''
  const day = value('weekday')
  const minutes = Number(value('hour')) * 60 + Number(value('minute'))
  const closing = day === 'Wed' ? 15 * 60 : 20 * 60
  if (minutes >= 480 && minutes < closing) return { open: true, text: 'Open · Closes at ' + (day === 'Wed' ? '3 PM' : '8 PM') }
  return { open: false, text: 'Closed · Opens ' + (minutes < 480 ? 'today' : 'tomorrow') + ' at 8 AM' }
}

export const menuCategories = ['All Items', 'Savory Buns', 'Sweet Buns & Rolls', 'Specialty Items', 'Custom Cakes'] as const
export function menuGroup(product: MenuProduct): typeof menuCategories[number] {
  if (/custom cakes?/i.test(product.category)) return 'Custom Cakes'
  if (/^(buns|breads)$/i.test(product.category)) {
    return /ham|sausage|pork|hot dog|scallion|tuna|cheese/i.test(product.name) ? 'Savory Buns' : 'Sweet Buns & Rolls'
  }
  if (/roll cakes/i.test(product.category)) return 'Specialty Items'
  return 'Specialty Items'
}
export function menuLeadTime(product: MenuProduct) {
  if (menuGroup(product) === 'Custom Cakes') return { text: 'Requires 3-5 Days Notice', tone: 'notice' }
  if (/^(buns|breads)$/i.test(product.category)) return { text: 'Same-Day Pickup / Fresh Daily', tone: 'daily' }
  return { text: 'Call to confirm availability', tone: 'availability' }
}

// Search relevance: full/partial name matches first, then description, then category.
export function rankMenuSearch(products: MenuProduct[], query: string): MenuProduct[] {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return products
  const terms = normalized.split(/\s+/)
  const score = (product: MenuProduct) => {
    const name = product.name.toLocaleLowerCase()
    const description = product.description.toLocaleLowerCase()
    return (name === normalized ? 10000 : name.startsWith(normalized) ? 5000 : name.includes(normalized) ? 3000 : 0)
      + terms.reduce((total, term) => total + (name.includes(term) ? 100 : description.includes(term) ? 10 : 1), 0)
  }
  return products.filter(product => matchesMenuSearch(product, query)).sort((a, b) => score(b) - score(a))
}
export function menuDescription(text: string, limit = 60): string {
  const normalized = text.trim().replace(/\s+/g, ' ')
  if (normalized.length <= limit) return normalized
  const words = normalized.split(' ')
  let excerpt = words.shift() || ''
  for (const word of words) {
    if ((excerpt + ' ' + word).length > limit) break
    excerpt += ' ' + word
  }
  // Keep a single long word intact instead of cutting it mid-word.
  return excerpt + (excerpt.length < normalized.length ? '…' : '')
}
