'use strict'
// Admin app push notifications: wording, reminder timing, removing gone devices, and the reminder job's secret.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

const { load, mocks } = createLoader()
const msg = load('lib/push-messages.ts')

// Sat 2026-10-31, 10:00 AM in Las Vegas.
const now = new Date('2026-10-31T17:00:00Z')
const order = (extra = {}) => ({
  id: '00000000-0000-4000-8000-000000000001',
  orderNo: 1042,
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '7025550123',
  size: '8-inch',
  flavor: 'Vanilla',
  filling: 'Strawberry',
  cakeMessage: '',
  notes: '',
  pickupDate: '2026-11-04',
  pickupTime: '14:00',
  price: 45,
  createdAt: now.toISOString(),
  status: 'awaiting_approval',
  ...extra,
})

test('new order push: short cake line, URGENT for today/tomorrow, TEST for tests, deep link', () => {
  const later = msg.newOrderPush(order(), now)
  assert.equal(later.title, 'Needs approval')
  assert.equal(later.body, '🎂 8" vanilla/strawberry · Wed 2 PM · Jane D')
  assert.equal(later.url, '/admin/orders/00000000-0000-4000-8000-000000000001')

  const today = msg.newOrderPush(order({ pickupDate: '2026-10-31', pickupTime: '15:30', size: 'half-sheet' }), now)
  assert.equal(today.title, 'URGENT · Needs approval')
  assert.equal(today.body, '🎂 ½ sheet vanilla/strawberry · Today 3:30 PM · Jane D')
  assert.equal(msg.newOrderPush(order({ pickupDate: '2026-11-01' }), now).title, 'URGENT · Needs approval')

  const testOrder = msg.newOrderPush(order({ test: true, status: 'paid', pickupDate: '2026-10-31' }), now)
  assert.equal(testOrder.title, 'TEST · New paid cake order')
})

test('names and times are shortened for the lock screen', () => {
  assert.equal(msg.shortName('Jane'), 'Jane')
  assert.equal(msg.shortName('  Mary Ann  lee '), 'Mary L')
  assert.equal(msg.shortWhen('2026-11-01', '09:30', now), 'Tomorrow 9:30 AM')
  assert.equal(msg.shortWhen('2026-11-07', '12:00', now), 'Sat 12 PM')
})

test('custom cake inquiry push', () => {
  const push = msg.newInquiryPush({
    id: '00000000-0000-4000-8000-000000000009',
    name: 'Linda Park',
    eventType: 'Birthday',
    eventDate: '2026-11-08',
    servings: '20',
    test: true,
  })
  assert.equal(push.title, 'TEST · Custom cake inquiry')
  assert.equal(push.body, '🎂 Birthday · Sun, Nov 8 · 20 servings · Linda P')
  assert.equal(push.url, '/admin/inquiries/00000000-0000-4000-8000-000000000009')
})

const minutes = n => new Date(now.getTime() + n * 60_000)
test('reminders: urgent orders halfway and 15 minutes before cancelling', () => {
  // Placed at 10:00, must be answered by 11:00, pickup today.
  const urgent = order({ pickupDate: '2026-10-31', approveBy: minutes(60).toISOString() })
  const kinds = at => msg.dueReminders([urgent], at).map(r => r.kind)
  assert.deepEqual(kinds(minutes(20)), [])
  assert.deepEqual(kinds(minutes(30)), ['answer-half'])
  assert.deepEqual(kinds(minutes(46)), ['answer-final'])
  assert.deepEqual(kinds(minutes(61)), [])
  assert.equal(msg.dueReminders([urgent], minutes(50))[0].push.title, 'URGENT · Cancels in 15 min')
})

test('reminders: card hold ending within 24 hours, for orders that are not urgent', () => {
  const held = order({ pickupDate: '2026-11-20', approveBy: minutes(7 * 24 * 60).toISOString() })
  assert.deepEqual(msg.dueReminders([held], minutes(5 * 24 * 60)), [])
  assert.deepEqual(
    msg.dueReminders([held], minutes(6 * 24 * 60 + 60)).map(r => r.kind),
    ['hold-24h'],
  )
  assert.deepEqual(msg.dueReminders([{ ...held, status: 'paid' }], minutes(6 * 24 * 60 + 60)), [])
})

test('reminders: still checking with kitchen every 3 hours, 9 AM to 8 PM only', () => {
  const checking = order({ status: 'checking_kitchen', pickupDate: '2026-11-20', kitchenAskedAt: now.toISOString() })
  const kinds = at => msg.dueReminders([checking], at).map(r => r.kind)
  assert.deepEqual(kinds(minutes(170)), [])
  assert.deepEqual(kinds(minutes(185)), ['kitchen-1']) // 1:05 PM
  assert.deepEqual(kinds(minutes(365)), ['kitchen-2']) // 4:05 PM
  assert.deepEqual(kinds(minutes(12 * 60 + 5)), []) // 10:05 PM: quiet hours
})

test('pushToAdmins: removes devices that are gone (404/410) and never throws', async () => {
  const deleted = []
  const updates = []
  const sql = (strings, ...values) => {
    const text = strings.join('?')
    if (text.startsWith('SELECT id,endpoint'))
      return Promise.resolve([
        { id: 'ok', endpoint: 'https://push.example/ok', p256dh: 'k', auth: 'a' },
        { id: 'gone', endpoint: 'https://push.example/gone', p256dh: 'k', auth: 'a' },
        { id: 'flaky', endpoint: 'https://push.example/flaky', p256dh: 'k', auth: 'a' },
      ])
    if (text.startsWith('DELETE')) deleted.push(values[0])
    if (text.startsWith('UPDATE')) updates.push(values[0])
    return Promise.resolve([])
  }
  mocks['./database'] = { verifiedDatabase: async () => sql }
  mocks['web-push'] = {
    __esModule: true,
    default: {
      setVapidDetails() {},
      async sendNotification(sub) {
        if (sub.endpoint.endsWith('gone')) throw Object.assign(new Error('gone'), { statusCode: 410 })
        if (sub.endpoint.endsWith('flaky')) throw Object.assign(new Error('busy'), { statusCode: 503 })
      },
    },
  }
  const push = load('lib/push.ts')
  const quiet = console.error
  console.error = () => {}
  try {
    // Not set up (no VAPID keys): nothing is sent.
    assert.deepEqual(await push.pushToAdmins({ title: 't', body: 'b', url: '/admin' }), { sent: 0, failed: 0 })
    Object.assign(process.env, { VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv', VAPID_SUBJECT: 'mailto:a@b.c' })
    const result = await push.pushToAdmins({ title: 't', body: 'b', url: '/admin' })
    assert.deepEqual(result, { sent: 1, failed: 2 })
    assert.deepEqual(deleted, ['gone'])
    assert.deepEqual(updates, ['ok'])
    // A builder that throws is caught too.
    assert.deepEqual(
      await push.notifyAdmins(() => {
        throw new Error('bad order')
      }),
      { sent: 0, failed: 0 },
    )
  } finally {
    console.error = quiet
    for (const key of ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT']) delete process.env[key]
  }
})

test('reminder job needs the CRON_SECRET', async () => {
  mocks['@/lib/cake-order-actions'] = { listCakeOrdersSettled: async () => [] }
  mocks['@/lib/push'] = { claimReminder: async () => true, pushToAdmins: async () => ({ sent: 1 }) }
  const route = load('app/api/cron/reminders/route.ts')
  const call = auth =>
    route.GET(new Request('http://example.test/api/cron/reminders', { headers: auth ? { authorization: auth } : {} }))
  delete process.env.CRON_SECRET
  assert.equal((await call('Bearer anything')).status, 401)
  process.env.CRON_SECRET = 'cron-test-secret'
  assert.equal((await call()).status, 401)
  assert.equal((await call('Bearer wrong')).status, 401)
  assert.equal((await call('Bearer cron-test-secret')).status, 200)
  delete process.env.CRON_SECRET
})

test('db/008: push tables; re-runnable; each reminder recorded once', async () => {
  const fs = require('node:fs')
  const path = require('node:path')
  const { PGlite } = require('@electric-sql/pglite')
  const sql = fs.readFileSync(path.resolve(__dirname, '..', '..', 'db', '008-push-notifications.sql'), 'utf8')
  const db = new PGlite()
  await db.exec(sql)
  await db.exec(sql)
  const claim = () =>
    db.query(
      `INSERT INTO bakery_push_reminders(order_id,kind) VALUES($1,'answer-final') ON CONFLICT DO NOTHING RETURNING kind`,
      ['00000000-0000-4000-8000-000000000001'],
    )
  assert.equal((await claim()).rows.length, 1)
  assert.equal((await claim()).rows.length, 0)
  await db.query(
    `INSERT INTO bakery_push_subscriptions(id,endpoint,p256dh,auth) VALUES('00000000-0000-4000-8000-000000000002','https://push.example/a','k','a')`,
  )
  await assert.rejects(
    db.query(
      `INSERT INTO bakery_push_subscriptions(id,endpoint,p256dh,auth) VALUES('00000000-0000-4000-8000-000000000003','https://push.example/a','k','a')`,
    ),
  )
  await db.close()
})
