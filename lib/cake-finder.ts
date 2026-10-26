import { cakeCatalog, deliveryOptions, type CakeSpec } from './cake-catalog'
import { FILLING_PRICE_GROUP } from './cake-order'

// Cake size finder on /custom-cakes: the customer says how many guests, which shape and filling,
// and we suggest the smallest cake that serves everyone, with a starting price.

export type FinderShape = CakeSpec['category'] | 'Any'
export const finderShapes: { value: FinderShape; label: string; hint?: string }[] = [
  { value: 'Round', label: 'Round' },
  { value: 'Sheet', label: 'Sheet (rectangle)' },
  { value: 'Multi-tier', label: 'Tiered', hint: '33+ guests' },
  { value: 'Any', label: 'Not sure' },
]
export const MAX_GUESTS = 999

const bySize = (shape: CakeSpec['category']) =>
  cakeCatalog.filter(cake => cake.category === shape).sort((a, b) => a.servings - b.servings)

/** Smallest cake of a shape that serves everyone, or null when even the largest is too small. */
export function smallestFit(guests: number, shape: CakeSpec['category']) {
  return bySize(shape).find(cake => cake.servings >= guests) ?? null
}

/** Starting price for a cake and filling. Tiered cakes have one price; unpriced fillings give null. */
export function startingPrice(cake: CakeSpec, filling: string) {
  if (cake.category === 'Multi-tier') return cake.prices[0]
  const group = FILLING_PRICE_GROUP[filling]
  return group === undefined ? null : cake.prices[group]
}
/** Lowest and highest price across fillings, for "Please recommend" or a custom filling. */
export const priceRange = (cake: CakeSpec) => [Math.min(...cake.prices), Math.max(...cake.prices)] as const

/** Delivery fee for a fulfillment option: 0 for pickup, null when the bakery quotes it. */
export function deliveryFee(fulfillment: string) {
  if (fulfillment === deliveryOptions[0]) return 0
  const match = /\$(\d+)$/.exec(fulfillment)
  return match ? Number(match[1]) : null
}

export type Recommendation = {
  /** The suggested cake, or null when no single cake serves this many guests. */
  best: CakeSpec | null
  /** The same guest count in other shapes, so the customer can compare. */
  others: CakeSpec[]
  /** The next size up in the same shape, for extra slices. */
  bigger: CakeSpec | null
  /** True when the chosen shape can't serve this many and best is another shape. */
  switched: boolean
}

export function recommend(guests: number, shape: FinderShape, filling: string): Recommendation {
  const shapes: CakeSpec['category'][] = ['Round', 'Sheet', 'Multi-tier']
  const fits = shapes.map(s => smallestFit(guests, s)).filter((cake): cake is CakeSpec => !!cake)
  // Sort key: price for the chosen filling (or the cheapest filling), so "Not sure" picks the best value.
  const cost = (cake: CakeSpec) => startingPrice(cake, filling) ?? priceRange(cake)[0]
  let best: CakeSpec | null
  if (shape === 'Any') {
    // Tiered only when nothing else fits. Same price: the cake that serves more wins.
    const plain = fits.filter(cake => cake.category !== 'Multi-tier')
    best = (plain.length ? plain : fits).sort((a, b) => cost(a) - cost(b) || b.servings - a.servings)[0] ?? null
  } else best = fits.find(cake => cake.category === shape) ?? null
  // The chosen shape doesn't go that big: suggest the smallest cake of another shape that does.
  const switched = !best && fits.length > 0
  if (switched) best = [...fits].sort((a, b) => a.servings - b.servings)[0]
  const others = fits.filter(cake => cake !== best)
  const sameShape = best ? bySize(best.category) : []
  const bigger = best ? (sameShape[sameShape.indexOf(best) + 1] ?? null) : null
  return { best, others, bigger, switched }
}

/** Largest single cake we list, for the "too many guests" message. */
export const largestServings = Math.max(...cakeCatalog.map(cake => cake.servings))
