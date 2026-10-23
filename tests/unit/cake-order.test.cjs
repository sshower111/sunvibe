'use strict'
// Online cake orders: pickup times, approval rules, prices, the Chinese text for Mom, and the order/payment flow
// (public route, admin approve/decline, Square webhook) against an in-memory database with Square and email faked.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { createHmac } = require('node:crypto')
const { test, after } = require('node:test')
const { PGlite } = require('@electric-sql/pglite')
const { createLoader } = require('../helpers/load-ts.cjs')

const db = new PGlite()
after(() => db.close())
async function sql(strings, ...values) {
  const query = strings.reduce((text, part, i) => text + part + (i < values.length ? '$' + (i + 1) : ''), '')
  return (await db.query(query, values)).rows
}
sql.json = value => JSON.stringify(value)

Object.assign(process.env, {
  ADMIN_PASSWORD: 'test-only',
  CAMPAIGN_STORAGE_SECRET: 'test-encryption',
  DATABASE_URL: 'test-only',
  RESEND_API_KEY: 'test-only',
  NEXT_PUBLIC_SQUARE_APPLICATION_ID: 'sandbox-app',
  SQUARE_LOCATION_ID: 'LOC',
  SQUARE_ACCESS_TOKEN: 'test-only',
  SQUARE_WEBHOOK_SIGNATURE_KEY: 'hook-key',
  SQUARE_WEBHOOK_URL: 'https://sunvillebakerylv.com/api/square/webhook',
})

const emails = []
const square = { calls: [], payments: new Map(), decline: false }
const realSquare = createLoader().load('lib/square.ts')
const fakeSquare = {
  ...realSquare,
  squareClientConfig: () => ({ applicationId: 'sandbox-app', locationId: 'LOC', environment: 'sandbox' }),
  async createPayment(input) {
    square.calls.push(['create', input])
    if (square.decline) throw new realSquare.SquareError('declined', 'CARD_DECLINED', 402)
    const payment = { id: 'pay-' + square.payments.size, status: input.autocomplete ? 'COMPLETED' : 'APPROVED' }
    square.payments.set(payment.id, payment)
    return payment
  },
  async completePayment(id) {
    square.calls.push(['complete', id])
    const payment = square.payments.get(id)
    if (payment.status !== 'APPROVED') throw new realSquare.SquareError('no', 'BAD_REQUEST', 400)
    payment.status = 'COMPLETED'
    return payment
  },
  async cancelPayment(id) {
    square.calls.push(['cancel', id])
    const payment = square.payments.get(id)
    payment.status = 'CANCELED'
    return payment
  },
  getPayment: async id => square.payments.get(id),
}
const { load, root } = createLoader({
  mocks: {
    postgres: () => sql,
    '@/lib/square': fakeSquare,
    './square': fakeSquare,
    '@/lib/turnstile': { verifyTurnstile: async () => true },
    // The real module starts a cleanup timer that keeps the test process alive.
    '@/lib/security': {
      rateLimiter: { check: () => true },
      getClientIp: () => 'test',
      escapeHtml: value =>
        value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]),
    },
    resend: {
      Resend: class {
        emails = { send: async message => (emails.push(message), { data: {}, error: null }) }
      },
    },
    'next/headers': { cookies: async () => ({ get: () => undefined }) },
  },
})
const rules = load('lib/cake-order.ts')
const { storeDate, addDays } = load('lib/occasion-dates.ts')

// Friday Oct 23 2026, 8:00 AM in Las Vegas (PDT).
const now = new Date('2026-10-23T15:00:00Z')

test('pickup times: same day from 10 AM with 3 hours notice, next day from 9:30, Wednesday closes early', () => {
  const sameDay = rules.pickupSlots('2026-10-23', now)
  assert.equal(sameDay[0], '11:00')
  assert.equal(sameDay.at(-1), '19:30')
  assert.equal(rules.pickupSlots('2026-10-23', new Date('2026-10-23T13:00:00Z'))[0], '10:00')
  assert.equal(rules.pickupSlots('2026-10-24', now)[0], '09:30')
  assert.equal(rules.pickupSlots('2026-10-28', now).at(-1), '14:30')
  assert.deepEqual(rules.pickupSlots('2026-10-22', now), [])
  assert.deepEqual(rules.pickupSlots('2026-10-23', new Date('2026-10-24T00:00:00Z')), [])
  assert.equal(rules.vegasInstant('2026-12-01', '09:30').toISOString(), '2026-12-01T17:30:00.000Z')
})

test('approval: same day always; next day only for 6", 10", 12" and 1/2 sheet', () => {
  assert.deepEqual(rules.decideOrder('8-inch', '2026-10-24', '09:30', now), { ok: true, needsApproval: false })
  assert.deepEqual(rules.decideOrder('quarter-sheet', '2026-10-24', '09:30', now), { ok: true, needsApproval: false })
  for (const size of ['6-inch', '10-inch', '12-inch', 'half-sheet']) {
    const next = rules.decideOrder(size, '2026-10-24', '12:00', now)
    assert.equal(next.needsApproval, true, size)
    assert.equal(next.approveBy.toISOString(), '2026-10-24T03:00:00.000Z') // 8 PM tonight
    assert.deepEqual(rules.decideOrder(size, '2026-10-25', '09:30', now), { ok: true, needsApproval: false })
  }
  const early = rules.decideOrder('10-inch', '2026-10-24', '09:30', now)
  assert.equal(early.approveBy.toISOString(), '2026-10-24T03:00:00.000Z')
  const late = rules.decideOrder('10-inch', '2026-10-24', '09:30', new Date('2026-10-24T05:00:00Z'))
  assert.equal(late.approveBy.toISOString(), '2026-10-24T13:30:00.000Z') // 3 hours before pickup
  const same = rules.decideOrder('8-inch', '2026-10-23', '11:00', now)
  assert.equal(same.needsApproval, true)
  assert.equal(same.approveBy.toISOString(), '2026-10-23T16:00:00.000Z')
  assert.equal(rules.decideOrder('8-inch', '2026-10-23', '10:30', now).ok, false)
  assert.equal(rules.decideOrder('14-inch', '2026-10-30', '12:00', now).ok, false)
})

test('prices follow the pricing sheet column for the filling', () => {
  assert.equal(rules.cakePrice('8-inch', 'Custard'), 36)
  assert.equal(rules.cakePrice('8-inch', 'Strawberry Banana'), 40)
  assert.equal(rules.cakePrice('10-inch', 'Mango'), 78)
  assert.equal(rules.cakePrice('half-sheet', 'Durian'), 158)
  assert.equal(rules.cakePrice('14-inch', 'Mango'), null)
  assert.equal(rules.cakePrice('8-inch', 'Something else (e.g., passion fruit)'), null)
  for (const filling of rules.ORDER_FILLINGS) assert.notEqual(rules.cakePrice('6-inch', filling), null)
})

test('text for Mom is Hong Kong Chinese in the agreed order', () => {
  const text = rules.momText({
    phone: '(702) 555-0123',
    size: '8-inch',
    flavor: 'Chocolate',
    filling: 'Mango',
    pickupDate: '2026-10-24',
    pickupTime: '15:00',
    cakeMessage: 'Happy Birthday Amy',
    notes: '',
  })
  assert.equal(
    text,
    [
      '電話：(702) 555-0123',
      '尺寸：8 吋圓形',
      '口味：朱古力',
      '餡料：芒果',
      '取貨：10月24日（星期六）下午3:00',
      '方式：自取',
      '蛋糕上的字：Happy Birthday Amy',
    ].join('\n'),
  )
  assert.match(rules.zhPickup('2026-10-28', '09:30'), /^10月28日（星期三）上午9:30$/)
})

const today = storeDate()
const order = (fields = {}) => ({
  requestId: crypto.randomUUID(),
  name: 'Amy Chen',
  email: 'amy@example.test',
  phone: '7025550123',
  size: '8-inch',
  flavor: 'Vanilla',
  filling: 'Mango',
  cakeMessage: '',
  pickupDate: addDays(today, 7),
  pickupTime: '12:00',
  notes: '',
  cardToken: 'cnon:card',
  captchaToken: 'ok',
  ...fields,
})
const post = (route, body) =>
  route.POST(
    new Request('http://test.invalid/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '203.0.113.' + Math.floor(Math.random() * 250),
      },
      body: JSON.stringify(body),
    }),
  )

test('ordering: paid now, held for approval, declined card, approve, decline and expiry', async () => {
  await db.exec(fs.readFileSync(path.join(root, 'db/001-bakery.sql'), 'utf8'))
  await db.exec(fs.readFileSync(path.join(root, 'db/003-cake-orders.sql'), 'utf8'))
  await db.exec(fs.readFileSync(path.join(root, 'db/003-cake-orders.sql'), 'utf8')) // re-runnable
  await db.exec(
    "INSERT INTO bakery_migrations(scope,record_count) VALUES('menu',0),('content',0) ON CONFLICT DO NOTHING",
  )
  const route = load('app/api/cake-orders/route.ts')
  const admin = load('app/api/admin/cake-orders/route.ts')
  const webhook = load('app/api/square/webhook/route.ts')
  const store = load('lib/cake-orders-store.ts')
  const adminCall = body => post(admin, { password: 'test-only', ...body })

  // 8" a week ahead: charged now.
  const paid = order()
  let r = await post(route, paid)
  assert.equal(r.status, 200)
  assert.equal((await r.json()).held, false)
  assert.equal(square.calls.at(-1)[1].autocomplete, true)
  assert.equal(square.calls.at(-1)[1].amountCents, 4200)
  assert.equal((await store.getCakeOrder(paid.requestId)).status, 'paid')
  assert(!(await db.query('SELECT payload FROM bakery_cake_orders')).rows[0].payload.includes('Amy'))
  assert.equal(emails.length, 2)
  assert(emails.some(e => e.text.includes('餡料：芒果')))
  // Same request again is not a second order.
  assert.equal((await post(route, paid)).status, 409)

  // A tampered price can't be sent; the server prices the cake.
  r = await post(route, order({ size: '20-inch' }))
  assert.equal(r.status, 400)

  // Declined card: nothing saved as an order, and the customer can retry with another card.
  square.decline = true
  const retry = order()
  r = await post(route, retry)
  assert.equal(r.status, 402)
  assert.match((await r.json()).error, /declined/)
  assert.equal((await store.getCakeOrder(retry.requestId)).status, 'failed')
  square.decline = false
  assert.equal((await post(route, { ...retry, cardToken: 'cnon:other' })).status, 200)

  // 10" tomorrow: card only held, bakery must approve.
  const held = order({ size: '10-inch', pickupDate: addDays(today, 1) })
  r = await post(route, held)
  const heldBody = await r.json()
  assert.equal(heldBody.held, true)
  const createCall = square.calls.at(-1)[1]
  assert.equal(createCall.autocomplete, false)
  assert(createCall.holdMinutes >= 60)
  const heldOrder = await store.getCakeOrder(held.requestId)
  assert.equal(heldOrder.status, 'awaiting_approval')
  assert(emails.some(e => e.subject.startsWith('APPROVE BY')))
  assert.equal((await post(admin, { action: 'approve', id: held.requestId })).status, 401)
  r = await adminCall({ action: 'approve', id: held.requestId })
  assert.equal(r.status, 200)
  assert.equal((await store.getCakeOrder(held.requestId)).status, 'paid')
  assert(emails.at(-1).subject.includes('is confirmed'))
  assert.equal((await adminCall({ action: 'approve', id: held.requestId })).status, 409)

  // Declined by the bakery: hold released, customer told.
  const declined = order({ size: '6-inch', pickupDate: addDays(today, 1) })
  await post(route, declined)
  r = await adminCall({ action: 'decline', id: declined.requestId })
  assert.equal(r.status, 200)
  const declinedOrder = await store.getCakeOrder(declined.requestId)
  assert.equal(declinedOrder.status, 'declined')
  assert.equal(square.payments.get(declinedOrder.paymentId).status, 'CANCELED')
  assert(emails.at(-1).subject.includes("can't make"))

  // Not approved in time: Square releases the hold and calls the webhook.
  const expiring = order({ size: 'half-sheet', pickupDate: addDays(today, 1) })
  await post(route, expiring)
  const expiringOrder = await store.getCakeOrder(expiring.requestId)
  square.payments.get(expiringOrder.paymentId).status = 'CANCELED'
  const event = JSON.stringify({
    type: 'payment.updated',
    data: { object: { payment: { id: expiringOrder.paymentId, status: 'CANCELED' } } },
  })
  const sign = body =>
    createHmac('sha256', 'hook-key')
      .update(process.env.SQUARE_WEBHOOK_URL + body)
      .digest('base64')
  const hook = signature =>
    webhook.POST(
      new Request('http://test.invalid', {
        method: 'POST',
        headers: { 'x-square-hmacsha256-signature': signature },
        body: event,
      }),
    )
  assert.equal((await hook('bad')).status, 401)
  const before = emails.length
  assert.equal((await hook(sign(event))).status, 200)
  assert.equal((await hook(sign(event))).status, 200) // Square retries; only one email
  assert.equal((await store.getCakeOrder(expiring.requestId)).status, 'expired')
  assert.equal(emails.length, before + 1)

  // Admin list settles a hold whose approval time passed even without the webhook.
  const late = order({ size: '12-inch', pickupDate: addDays(today, 1) })
  await post(route, late)
  await db.query("UPDATE bakery_cake_orders SET approve_by = now() - interval '1 minute' WHERE id = $1", [
    late.requestId,
  ])
  const list = await (await adminCall({ action: 'list' })).json()
  assert.equal(list.orders.find(o => o.id === late.requestId).status, 'expired')
  assert.equal(square.calls.at(-1)[0], 'cancel')

  // Picked up, and undo.
  assert.equal((await adminCall({ action: 'picked_up', id: paid.requestId })).status, 200)
  assert.equal((await store.getCakeOrder(paid.requestId)).status, 'picked_up')
  assert.equal((await adminCall({ action: 'not_picked_up', id: paid.requestId })).status, 200)
  assert.equal((await adminCall({ action: 'picked_up', id: held.requestId })).status, 200)
})

test('admin test orders: inbox-only emails, approval, no card in production, deletable', async () => {
  const admin = load('app/api/admin/cake-orders/route.ts')
  const store = load('lib/cake-orders-store.ts')
  const adminCall = body => post(admin, { password: 'test-only', ...body })
  const inbox = load('lib/email.ts').bakeryInbox()

  // Sandbox: goes through Square with the test card.
  let before = emails.length
  let r = await (await adminCall({ action: 'test', scenario: 'paid' })).json()
  assert.equal(r.held, false)
  assert.equal(r.viaSquare, true)
  assert.equal(square.calls.at(-1)[1].sourceId, 'cnon:card-nonce-ok')
  const fresh = emails.slice(before)
  assert.equal(fresh.length, 2)
  assert(fresh.every(e => e.to === inbox && e.subject.startsWith('[TEST]')))

  // Production: no Square call at all; approve and decline still work.
  process.env.SQUARE_ENVIRONMENT = 'production'
  try {
    const calls = square.calls.length
    r = await (await adminCall({ action: 'test', scenario: 'approval' })).json()
    assert.equal(r.held, true)
    assert.equal(r.viaSquare, false)
    const list = (await (await adminCall({ action: 'list' })).json()).orders
    const test = list.find(o => o.test && o.status === 'awaiting_approval')
    assert.equal((await adminCall({ action: 'approve', id: test.id })).status, 200)
    assert.equal((await store.getCakeOrder(test.id)).status, 'paid')
    r = await (await adminCall({ action: 'test', scenario: 'approval' })).json()
    const second = (await (await adminCall({ action: 'list' })).json()).orders.find(
      o => o.test && o.status === 'awaiting_approval',
    )
    assert.equal((await adminCall({ action: 'decline', id: second.id })).status, 200)
    assert.equal(square.calls.length, calls)
    assert(emails.at(-1).subject.startsWith("[TEST] We can't make"))
    assert.equal(emails.at(-1).to, inbox)

    // Only test orders can be deleted.
    assert.equal((await adminCall({ action: 'delete', id: test.id })).status, 200)
    assert.equal(await store.getCakeOrder(test.id), null)
    const real = (await (await adminCall({ action: 'list' })).json()).orders.find(o => !o.test)
    assert.equal((await adminCall({ action: 'delete', id: real.id })).status, 409)
  } finally {
    delete process.env.SQUARE_ENVIRONMENT
  }
})
