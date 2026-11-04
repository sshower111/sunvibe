'use strict'
// Staff phones: sign in with STAFF_PASSWORD, open only the scanned order (no email), confirm pickup or delivery.
// The staff session never works for admin endpoints.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

process.env.ADMIN_PASSWORD = 'admin-secret'
process.env.STAFF_PASSWORD = 'staff-secret'
const ID = '00000000-0000-4000-8000-0000000000aa'
let order
const events = []
const notes = []
const { load } = createLoader({
  mocks: {
    '@/lib/security': { getClientIp: () => '1.2.3.4', rateLimiter: { check: async () => true } },
    '@/lib/cake-orders-store': {
      getCakeOrder: async id => (id === ID ? { ...order } : null),
      listOrderEvents: async () => events,
      moveCakeOrder: async (id, from, to, action) => {
        if (order.status !== from) return false
        order.status = to
        events.push({ at: '2026-11-08T23:00:00.000Z', action })
        return true
      },
    },
    '@/lib/discord-orders': { refreshOrderCardQuietly: async (id, note) => notes.push(note) },
  },
})
const session = load('app/api/staff/session/route.ts')
const pickup = load('app/api/staff/pickup/route.ts')
const adminOrders = load('app/api/admin/cake-orders/route.ts')
const req = (url, body, cookie = '') =>
  new Request('http://example.test' + url, { method: 'POST', body: JSON.stringify(body), headers: { cookie } })

test('staff phones see only the scanned order and can confirm it, nothing else', async () => {
  order = {
    id: ID,
    orderNo: 1042,
    name: 'Ann',
    email: 'ann@example.com',
    phone: '7025550100',
    size: '8-inch',
    flavor: 'Vanilla',
    filling: 'Mango',
    pickupDate: '2026-11-08',
    pickupTime: '15:00',
    fulfillment: 'Casino / Hotel delivery — $50',
    deliveryAddress: 'Bellagio',
    price: 120,
    deposit: 40,
    status: 'deposit_paid',
    paymentId: 'pay_1',
  }
  // Signed out: nothing.
  assert.equal((await pickup.POST(req('/api/staff/pickup', { action: 'get', id: ID }))).status, 401)
  assert.equal((await session.POST(req('/api/staff/session', { password: 'wrong' }))).status, 401)
  const signIn = await session.POST(req('/api/staff/session', { password: 'staff-secret' }))
  assert.equal(signIn.status, 200)
  const cookie = signIn.headers.get('set-cookie').split(';')[0]
  assert.match(cookie, /^sunville_staff=/)

  const r = await (await pickup.POST(req('/api/staff/pickup', { action: 'get', id: ID }, cookie))).json()
  assert.equal(r.role, 'staff')
  assert.equal(r.order.phone, '7025550100')
  assert.equal(r.order.deposit, 40)
  assert(!('email' in r.order) && !('paymentId' in r.order), 'only what the counter needs')
  assert.equal((await pickup.POST(req('/api/staff/pickup', { action: 'get', id: 'nope' }, cookie))).status, 400)

  // Confirm: a delivery is marked picked up with "delivered" in its history, and the Discord card says so.
  const done = await (await pickup.POST(req('/api/staff/pickup', { action: 'confirm', id: ID }, cookie))).json()
  assert.equal(done.order.status, 'picked_up')
  assert.equal(done.doneAt.action, 'delivered')
  assert.equal(notes.at(-1), '🚚 Delivered (QR code scanned by staff)')
  // Twice: refused.
  assert.equal((await pickup.POST(req('/api/staff/pickup', { action: 'confirm', id: ID }, cookie))).status, 409)

  // The staff session is not an admin session.
  const list = await adminOrders.POST(req('/api/admin/cake-orders', { action: 'list' }, cookie))
  assert.equal(list.status, 401)
})
