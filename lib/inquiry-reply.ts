import { cakeCatalog, type CakeSpec } from './cake-catalog'
import { CUSTOM_FILLING, fillings, flavors, inquiryRef, type StoredCakeInquiry } from './cake-inquiry'
import { SITE } from './site-info'

// Draft reply for a cake inquiry. It skips what the customer already told us and only covers
// what is new or still open: a size suggestion, a starting price, open choices, missing details, next step.
// Anything that needs the bakery's judgment is left in [square brackets] to fill in before sending.

// Index into each cake's prices (see priceGroups in cake-catalog.ts).
const fillingGroup: Record<string, number> = {
  Custard: 0,
  'Mixed Fresh Fruit': 1,
  Strawberry: 1,
  Banana: 1,
  'Strawberry Banana': 1,
  Mango: 2,
  Taro: 2,
  Coconut: 3,
  Durian: 3,
}
const budgetMax: Record<string, number> = {
  'Under $100': 100,
  '$100–$200': 200,
  '$200–$350': 350,
  '$350–$500': 500,
  '$500–$800': 800,
}
const deliveryFee: Record<string, number> = {
  'Local delivery (within 10 miles) — $30': 30,
  'Casino / Hotel delivery — $50': 50,
}
const RECOMMEND = 'Please recommend'
const list = (items: readonly string[]) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`
const lower = (items: readonly string[]) => items.map(i => i.toLowerCase())
/** "a" or "an" before a cake label (an 8-inch, an 18-inch, a 1/2 Sheet). */
const a = (label: string) => (/^(8|11|18)\b|^[aeiou]/i.test(label) ? `an ${label}` : `a ${label}`)

/** Smallest single-layer cake (round, then sheet) that covers the guest count. */
export function suggestSize(servings: number): CakeSpec | undefined {
  const fits = (category: CakeSpec['category']) =>
    cakeCatalog
      .filter(c => c.category === category && c.servings >= servings)
      .sort((a, b) => a.servings - b.servings)[0]
  return fits('Round') ?? fits('Sheet') ?? fits('Multi-tier')
}

export function startingPrice(cake: CakeSpec, filling: string): number | undefined {
  if (cake.category === 'Multi-tier') return cake.prices[0]
  const group = fillingGroup[filling]
  return group === undefined ? undefined : cake.prices[group]
}

export function draftReply(inquiry: StoredCakeInquiry) {
  const first = inquiry.name.trim().split(/\s+/)[0] || 'there'
  const date = new Date(inquiry.eventDate + 'T12:00:00Z').toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const servings = Number(inquiry.servings)
  const chosen = cakeCatalog.find(c => c.value === inquiry.size)
  const cake = chosen ?? suggestSize(servings)
  const price = cake && startingPrice(cake, inquiry.filling)
  const fee = deliveryFee[inquiry.fulfillment]
  const paragraphs: string[] = []
  const questions: string[] = []

  paragraphs.push(
    `Hi ${first},\n\nThanks for thinking of us for your ${inquiry.eventType === 'Other' ? 'celebration' : inquiry.eventType.toLowerCase()} on ${date}! [Confirm we're available that day.]`,
  )

  // Size and price: only what the form didn't settle.
  const sizeLines: string[] = []
  if (!chosen && cake)
    sizeLines.push(
      `For ${servings} ${servings === 1 ? 'guest' : 'guests'}, I'd suggest ${a(cake.label)} (about ${cake.servings} servings).`,
    )
  else if (!cake)
    sizeLines.push(
      `For ${servings} guests we'd recommend a larger tiered cake; we'll suggest the best option by phone.`,
    )
  else if (cake.servings < servings) {
    const bigger = suggestSize(servings)
    sizeLines.push(
      `Just a heads-up: ${a(cake.label)} serves about ${cake.servings}, a little under the ${servings} guests you mentioned.${bigger ? ` ${a(bigger.label).replace(/^a/, 'A')} would cover everyone.` : ''}`,
    )
  }
  if (cake && price !== undefined) {
    sizeLines.push(
      `${inquiry.filling in fillingGroup ? `With ${inquiry.filling.toLowerCase()} filling, it` : 'It'} starts at $${price}${fee ? `, plus $${fee} delivery` : ''}; the final price depends on the decoration. [Add the design price.]`,
    )
    const max = budgetMax[inquiry.budget]
    if (max !== undefined && price + (fee ?? 0) > max)
      sizeLines.push(
        `That's a little above the budget you mentioned, so we can suggest a simpler design or a smaller size if you'd like.`,
      )
  } else if (cake && cake.category !== 'Multi-tier')
    sizeLines.push(
      `${chosen ? a(cake.label).replace(/^a/, 'A') : 'It'} starts at $${Math.min(...cake.prices)}, depending on the filling and decoration.${fee ? ` Delivery is $${fee}.` : ''}`,
    )
  if (sizeLines.length) paragraphs.push(sizeLines.join(' '))

  // Open choices.
  if (inquiry.flavor === RECOMMEND && inquiry.filling === RECOMMEND)
    questions.push(
      `Our cake flavors are ${list(lower(flavors.slice(1)))}, and fillings include ${list(lower(fillings.slice(1, -1)))}. Any favorites, or anything to avoid? [Or add your recommendation.]`,
    )
  else if (inquiry.flavor === RECOMMEND)
    questions.push(
      `For the cake itself we have ${list(lower(flavors.slice(1)))}. Any favorites? [Or add your recommendation.]`,
    )
  else if (inquiry.filling === RECOMMEND)
    questions.push(
      `For the filling we have ${list(lower(fillings.slice(1, -1)))}. Any favorites? [Or add your recommendation.]`,
    )
  if (inquiry.filling === CUSTOM_FILLING)
    paragraphs.push(`About the filling you described: [Confirm whether we can make it, and its price.]`)

  // Missing details.
  if (inquiry.fulfillment !== 'Pickup' && !inquiry.deliveryAddress.trim())
    questions.push('What address or hotel should we deliver to?')
  if (inquiry.fulfillment === 'Other delivery — please advise')
    paragraphs.push('[Delivery: confirm whether we can deliver there, and the fee.]')
  if (!inquiry.eventTime)
    questions.push(
      inquiry.fulfillment === 'Pickup' ? 'What time would you like to pick it up?' : 'What time should it arrive?',
    )
  if (!inquiry.photoCount && inquiry.notes.trim().length < 30)
    questions.push(
      'Do you have a design in mind? Colors, a theme or a photo you like (just reply with it attached) helps us quote accurately.',
    )
  if (questions.length)
    paragraphs.push(
      questions.length === 1 ? questions[0] : `A few quick questions:\n${questions.map(q => `- ${q}`).join('\n')}`,
    )

  paragraphs.push(
    `Once we've settled the details, we'll send a payment link to confirm your order and date.\n\nThank you,\n${SITE.name}\n${SITE.phone}`,
  )
  return {
    subject: `Re: We received your cake inquiry ${inquiryRef(inquiry.id)} — ${SITE.name}`,
    body: paragraphs.join('\n\n'),
  }
}
