'use strict'
// Admin "Paid in store / by phone": an expired or declined order moves to paid; anything else is refused.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

const statuses = new Map()
const { load } = createLoader({
  mocks: {
    '@/lib/admin-auth': { isAdminRequest: () => true },
    '@/lib/cake-orders-store': {
      deleteTestOrder: async () => {},
      getCakeOrder: async () => null,
      moveCakeOrder: async (id, from, to) => {
        if (statuses.get(id) !== from) return false
        statuses.set(id, to)
        return true
      },
    },
    '@/lib/cake-order-actions': {
      approveOrder: async () => {},
      declineOrder: async () => {},
      createTestOrder: async () => ({}),
      listCakeOrdersSettled: async () => [],
    },
    '@/lib/email': { bakeryInbox: () => 'inbox@example.com' },
    '@/lib/custom-cake-orders': { resendPayLink: async () => true },
  },
})
const route = load('app/api/admin/cake-orders/route.ts')
const post = body =>
  route.POST(new Request('http://example.test/api/admin/cake-orders', { method: 'POST', body: JSON.stringify(body) }))

const id = n => `00000000-0000-4000-8000-00000000000${n}`

test('expired and declined orders can be marked paid another way', async () => {
  statuses.set(id(1), 'expired')
  statuses.set(id(2), 'declined')
  for (const n of [1, 2]) {
    const response = await post({ action: 'paid_offline', id: id(n) })
    assert.equal(response.status, 200)
    assert.equal(statuses.get(id(n)), 'paid')
  }
})

test('other orders are left alone', async () => {
  for (const status of ['awaiting_approval', 'paid', 'picked_up', 'failed']) {
    statuses.set(id(3), status)
    const response = await post({ action: 'paid_offline', id: id(3) })
    assert.equal(response.status, 409)
    assert.equal(statuses.get(id(3)), status)
  }
})
