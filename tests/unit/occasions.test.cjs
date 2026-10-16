'use strict'
// Festival pre-orders: Las Vegas date math, presets, campaign schema/status, server-side pricing,
// the public pre-order API and the admin inbox. Providers are mocked; nothing is sent. Run: pnpm test
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

const { load, mocks } = createLoader({
  mocks: { 'next/headers': { cookies: async () => ({ get: () => undefined }) } },
})

test('pre-order dates, campaigns, pricing, API and admin inbox', async () => {
  const model = load('lib/campaign-model.ts')
  const dates = load('lib/occasion-dates.ts')
  const presets = load('lib/occasion-presets.ts')
  const pre = load('lib/pre-order.ts')
  assert.equal(dates.storeDate(new Date('2026-09-24T06:59:59Z')), '2026-09-23')
  assert.equal(dates.storeDate(new Date('2026-09-24T07:00Z')), '2026-09-24')
  assert.equal(dates.addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(presets.OCCASION_PRESETS.find(p => p.id === 'mothers-us').dates(2027).start, '2027-05-09')
  assert.equal(presets.OCCASION_PRESETS.find(p => p.id === 'fathers').dates(2027).start, '2027-06-20')
  assert.equal(presets.OCCASION_PRESETS.find(p => p.id === 'lunar-new-year').dates(2030), null)
  const now = new Date('2026-09-24T12:00Z')
  const campaign = {
    id: 'mid-autumn-test',
    occasion: 'Mid-Autumn Festival',
    name: 'Mid-Autumn test',
    banner: { headline: 'Mooncakes are here', message: 'Pre-order for pickup.', ctaLabel: 'Pre-order now' },
    page: { title: 'Mid-Autumn pre-orders', intro: 'Reserve mooncakes for pickup.' },
    items: [{ id: 'mooncake', name: 'Mooncake', price: 12.34, maxPerOrder: 3 }],
    startsAt: '2026-09-24',
    endsAt: '2026-09-25',
    orderCutoff: '2026-09-24',
    published: true,
  }
  assert(model.campaignSchema.safeParse(campaign).success)
  assert.equal(model.campaignStatus(campaign, now), 'active')
  assert.equal(model.campaignStatus({ ...campaign, published: false }, now), 'draft')
  assert.equal(model.campaignStatus(campaign, new Date('2026-09-23T12:00Z')), 'scheduled')
  assert.equal(model.campaignStatus(campaign, new Date('2026-09-26T12:00Z')), 'ended')
  assert(!model.campaignSchema.safeParse({ ...campaign, endsAt: '2026-02-30' }).success)
  const input = {
    requestId: '19c820b6-4f45-4e6b-b98b-708ea04a5f1a',
    campaignId: campaign.id,
    name: 'Test only',
    phone: '7025550100',
    email: '',
    pickupDate: '2026-09-25',
    fulfillment: 'Pickup',
    notes: '',
    acknowledged: 'yes',
    items: [{ itemId: 'mooncake', qty: 2 }],
  }
  assert(pre.preOrderSchema.safeParse(input).success)
  assert.equal(pre.priceOrder(input, campaign, now)[0].price, 12.34)
  assert.throws(() => pre.priceOrder({ ...input, pickupDate: '2026-09-24' }, campaign, now))
  assert.throws(() => pre.priceOrder({ ...input, items: [{ itemId: 'mooncake', qty: 4 }] }, campaign, now))
  assert.throws(() => pre.priceOrder(input, { ...campaign, orderCutoff: '2026-09-23' }, now))
  assert(!pre.preOrderSchema.safeParse({ ...input, items: [] }).success)
  assert(!pre.preOrderSchema.safeParse({ ...input, items: [input.items[0], input.items[0]] }).success)

  // Public pre-order API
  let verified = true,
    saved = [],
    sent = []
  const today = dates.storeDate()
  const liveCampaign = {
    ...campaign,
    startsAt: today,
    endsAt: dates.addDays(today, 5),
    orderCutoff: dates.addDays(today, 3),
  }
  mocks['@/lib/campaigns'] = { getCampaign: async () => liveCampaign }
  mocks['@/lib/pre-orders-store'] = {
    saveOrder: async order => {
      const prior = saved.find(o => o.id === order.id)
      if (prior) return prior
      saved.push(order)
      return order
    },
  }
  mocks['@/lib/turnstile'] = {
    verifyTurnstile: async (token, action) => verified && token === 'test-token' && action === 'pre_order',
  }
  mocks['@/lib/security'] = { rateLimiter: { check: () => true }, getClientIp: () => 'test' }
  mocks.resend = {
    Resend: class {
      emails = {
        send: async (payload, options) => {
          sent.push({ payload, options })
          return { error: null }
        },
      }
    },
  }
  process.env.RESEND_API_KEY = 'test'
  process.env.TURNSTILE_SECRET_KEY = 'test'
  delete process.env.SMS_GATEWAY_EMAIL
  const route = load('app/api/pre-orders/route.ts')
  async function submit(patch = {}) {
    const data = { ...input, pickupDate: dates.addDays(today, 1), ...patch }
    const form = new FormData()
    for (const [k, v] of Object.entries(data)) form.set(k, k === 'items' ? JSON.stringify(v) : v)
    form.set('captchaToken', 'test-token')
    return route.POST(new Request('http://localhost/api/pre-orders', { method: 'POST', body: form }))
  }
  assert.equal((await submit()).status, 200)
  assert.equal(saved.length, 1)
  assert.equal(saved[0].items[0].price, 12.34)
  assert(sent[0].payload.text.includes('$24.68'))
  assert.equal((await submit()).status, 200)
  assert.equal(saved.length, 1)
  verified = false
  assert.equal((await submit()).status, 403)
  assert.equal(saved.length, 1)
  verified = true
  assert.equal((await submit({ items: [{ itemId: 'unknown', qty: 1 }] })).status, 400)
  assert.equal((await submit({ pickupDate: today })).status, 400)

  // Admin inbox
  process.env.ADMIN_PASSWORD = 'test-admin'
  let status = 'new'
  mocks['@/lib/pre-orders-store'] = {
    listOrders: async () => saved,
    updateOrderStatus: async (id, value) => {
      assert.equal(id, input.requestId)
      status = value
    },
  }
  const inbox = load('app/api/admin/pre-orders/route.ts')
  async function inboxCall(body) {
    return inbox.POST(
      new Request('http://localhost/api/admin/pre-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
  }
  assert.equal((await inboxCall({ password: 'wrong', action: 'list' })).status, 401)
  assert.equal((await inboxCall({ password: 'test-admin', action: 'list' })).status, 200)
  assert.equal(
    (await inboxCall({ password: 'test-admin', action: 'status', id: input.requestId, status: 'called' })).status,
    200,
  )
  assert.equal(status, 'called')
  assert.equal(
    (await inboxCall({ password: 'test-admin', action: 'status', id: input.requestId, status: 'paid' })).status,
    400,
  )
})
