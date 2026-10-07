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
  if (menuGroup(product) === 'Custom Cakes') return { text: '3–5 days’ notice', tone: 'notice' }
  if (/^(buns|breads)$/i.test(product.category)) return { text: 'Fresh daily', tone: 'daily' }
  return { text: 'Call to confirm availability', tone: 'availability' }
}

// Typo tolerance: a search term with no exact match anywhere on the menu is compared
// against each word with a small edit distance ("moncake" -> "mooncake").
const searchWords = (text: string) => text.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
function editDistance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let previous2: number[] = []
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, previous2[j - 2] + 1)
      current[j] = value
      rowMin = Math.min(rowMin, value)
    }
    if (rowMin > max) return max + 1
    previous2 = previous
    previous = current
  }
  return previous[b.length]
}
function fuzzyWordMatch(term: string, text: string) {
  // Short words and non-Latin text (e.g. Chinese) use exact matching only.
  if (term.length < 4 || !/[a-z]/.test(term)) return false
  const max = term.length >= 8 ? 2 : 1
  return searchWords(text).some(word => {
    for (let length = Math.max(1, term.length - max); length <= Math.min(word.length, term.length + max); length++) {
      if (editDistance(term, word.slice(0, length), max) <= max) return true
    }
    return false
  })
}
const productText = (product: MenuProduct) => [product.name, product.description, product.category].join(' ').toLocaleLowerCase()

export type MenuSearchResult = { results: MenuProduct[]; corrected: boolean }
// Search relevance: full/partial name matches first, then description, then category.
// Close (typo) matches are only used for terms that match nothing exactly, and rank last.
export function searchMenu(products: MenuProduct[], query: string): MenuSearchResult {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return { results: products, corrected: false }
  const terms = normalized.split(/\s+/)
  const texts = new Map(products.map(product => [product, productText(product)]))
  const needsFuzzy = new Set(terms.filter(term => !products.some(product => texts.get(product)!.includes(term))))
  const termScore = (product: MenuProduct, term: string) => {
    const name = product.name.toLocaleLowerCase()
    const text = texts.get(product)!
    if (text.includes(term)) return name.includes(term) ? 100 : product.description.toLocaleLowerCase().includes(term) ? 10 : 1
    if (needsFuzzy.has(term)) return fuzzyWordMatch(term, product.name) ? 50 : fuzzyWordMatch(term, text) ? 5 : -1
    return -1
  }
  const scored = products.map(product => {
    const name = product.name.toLocaleLowerCase()
    const parts = terms.map(term => termScore(product, term))
    if (parts.some(part => part < 0)) return null
    const phrase = name === normalized ? 10000 : name.startsWith(normalized) ? 5000 : name.includes(normalized) ? 3000 : 0
    return { product, score: phrase + parts.reduce((total, part) => total + part, 0) }
  }).filter((row): row is { product: MenuProduct; score: number } => row !== null)
  return { results: scored.sort((a, b) => b.score - a.score).map(row => row.product), corrected: needsFuzzy.size > 0 && scored.length > 0 }
}
export function rankMenuSearch(products: MenuProduct[], query: string): MenuProduct[] {
  return searchMenu(products, query).results
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
