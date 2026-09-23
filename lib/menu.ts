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
