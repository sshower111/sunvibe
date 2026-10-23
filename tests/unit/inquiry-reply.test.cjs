'use strict'
// Draft replies for cake inquiries: only open items, starting prices from the catalog, no repeated answers.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

const { load } = createLoader()
const { draftReply, suggestSize } = load('lib/inquiry-reply.ts')

const base = {
  id: '4f2a1111-1111-4111-8111-111111111111',
  createdAt: '2026-10-22T20:00:00.000Z',
  name: 'Amy Chen',
  email: 'amy@example.test',
  phone: '7025550100',
  eventDate: '2026-10-28',
  eventTime: '14:00',
  eventType: 'Birthday',
  servings: '12',
  size: '8-inch',
  flavor: 'Vanilla',
  filling: 'Mango',
  cakeMessage: 'Happy Birthday Amy',
  budget: '$100–$200',
  fulfillment: 'Pickup',
  deliveryAddress: '',
  notes: 'Pink and gold, simple buttercream flowers on top please',
  photoCount: 1,
  status: 'new',
  staffNotes: '',
}

test('a complete inquiry gets a short reply: price and next step only', () => {
  const { subject, body } = draftReply(base)
  if (process.env.SHOW) console.log(body)
  assert.equal(subject, 'Re: We received your cake inquiry #4F2A — Sunville Bakery')
  assert(body.startsWith('Hi Amy,'))
  assert(body.includes('Wednesday, October 28'))
  assert(body.includes('With mango filling, it starts at $42'))
  assert(!body.includes('questions'), 'nothing to ask')
  assert(!body.includes('Happy Birthday Amy'), 'does not repeat the form')
  assert(!body.includes('Vanilla') && !body.includes('vanilla'))
})

test('open choices and missing details become questions', () => {
  const { body } = draftReply({
    ...base,
    size: 'Not sure',
    servings: '25',
    flavor: 'Please recommend',
    filling: 'Please recommend',
    eventTime: '',
    fulfillment: 'Casino / Hotel delivery — $50',
    photoCount: 0,
    notes: '',
    budget: 'Under $100',
  })
  if (process.env.SHOW) console.log('\n---\n' + body)
  assert(body.includes("I'd suggest a 10-inch round (about 25 servings)"))
  assert(body.includes('(about 25 servings). It starts at $62') && body.includes('Delivery is $50'))
  assert(body.includes('A few quick questions:'))
  assert(body.includes('What address or hotel'))
  assert(body.includes('What time should it arrive?'))
  assert(body.includes('Do you have a design in mind?'))
  assert(body.includes('green tea') && body.includes('strawberry banana'))
})

test('budget, undersized cakes, custom fillings and tiers', () => {
  let { body } = draftReply({ ...base, size: '6-inch', servings: '20', filling: 'Durian', budget: 'Under $100' })
  assert(body.includes('serves about 8, a little under the 20 guests'))
  assert(body.includes('A 10-inch round would cover everyone'))
  ;({ body } = draftReply({ ...base, size: '12-inch', filling: 'Durian', budget: 'Under $100' }))
  assert(body.includes('starts at $168') && body.includes('above the budget'))
  ;({ body } = draftReply({ ...base, filling: 'Something else (e.g., passion fruit)' }))
  assert(body.includes('About the filling you described'))
  assert(body.includes('An 8-inch round starts at $36'))
  ;({ body } = draftReply({ ...base, size: 'tier-8-12', filling: 'Please recommend' }))
  assert(body.includes('It starts at $238'))
  assert.equal(suggestSize(500), undefined)
  ;({ body } = draftReply({ ...base, size: 'Not sure', servings: '500' }))
  assert(body.includes('larger tiered cake'))
})
