'use strict'
// Admin Home Screen app: section addresses, the pinned order lists and the long phone sign-in.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createLoader } = require('../helpers/load-ts.cjs')

const { load, mocks } = createLoader()
const nav = load('lib/admin-nav.ts')
const { orderBoard, isUrgent } = load('lib/admin-order-board.ts')

test('admin addresses map to sections and bottom tabs', () => {
  assert.equal(nav.sectionOf('/admin/orders'), 'orders')
  assert.equal(nav.sectionOf('/admin/orders/1234'), 'orders')
  assert.equal(nav.sectionOf('/admin/more'), 'more')
  assert.equal(nav.sectionOf('/admin'), null)
  assert.equal(nav.sectionOf('/admin/unknown'), null)
  assert.equal(nav.bottomTabOf('gallery'), 'more')
  assert.equal(nav.bottomTabOf('settings'), 'more')
  assert.equal(nav.bottomTabOf('inquiries'), 'inquiries')
  assert.equal(nav.bottomTabOf(null), 'orders')
})

test('old ?tab= links still open the right section', () => {
  assert.equal(nav.adminHome(), '/admin/orders')
  assert.equal(nav.adminHome('cake-orders'), '/admin/orders')
  assert.equal(nav.adminHome('cake-inquiries'), '/admin/inquiries')
  assert.equal(nav.adminHome('pre-orders'), '/admin/pre-orders')
  assert.equal(nav.adminHome('nonsense'), '/admin/orders')
  assert.equal(nav.adminHome(['menu', 'gallery']), '/admin/orders')
})

// 10:00 AM in Las Vegas on Sat 2026-10-31.
const now = new Date('2026-10-31T17:00:00Z')
let n = 0
const order = (status, pickupDate, extra = {}) => ({
  id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  status,
  pickupDate,
  pickupTime: '14:00',
  createdAt: now.toISOString(),
  price: 40,
  ...extra,
})

test('same-day and next-day pickups are urgent', () => {
  assert.equal(isUrgent({ pickupDate: '2026-10-31' }, now), true)
  assert.equal(isUrgent({ pickupDate: '2026-11-01' }, now), true)
  assert.equal(isUrgent({ pickupDate: '2026-11-02' }, now), false)
})

test('pinned lists: urgent orders first, then by pickup', () => {
  const later = order('awaiting_approval', '2026-11-05')
  const soon = order('awaiting_approval', '2026-11-03')
  const tomorrow = order('awaiting_approval', '2026-11-01')
  const today = order('awaiting_approval', '2026-10-31')
  const expired = order('hold_expired', '2026-11-04')
  const board = orderBoard([later, soon, tomorrow, today, expired], now)
  assert.deepEqual(
    board.needsApproval.map(o => o.id),
    [today.id, tomorrow.id, soon.id, expired.id, later.id],
  )
})

test('pinned lists: checking with kitchen, and paid orders not yet sent to the kitchen', () => {
  const checking = order('checking_kitchen', '2026-11-02', { kitchenAskedAt: now.toISOString() })
  const paidNotSent = order('paid', '2026-11-03')
  const depositNotSent = order('deposit_paid', '2026-11-02')
  const paidSent = order('paid', '2026-11-03', { kitchenSentAt: now.toISOString() })
  const pickedUp = order('picked_up', '2026-10-30')
  const declined = order('declined', '2026-11-03')
  const board = orderBoard([checking, paidNotSent, depositNotSent, paidSent, pickedUp, declined], now)
  assert.deepEqual(board.needsApproval, [])
  assert.deepEqual(
    board.checkingKitchen.map(o => o.id),
    [checking.id],
  )
  assert.deepEqual(
    board.notSentToKitchen.map(o => o.id),
    [depositNotSent.id, paidNotSent.id],
  )
})

test('Home Screen app sign-in lasts 90 days and renews; browser sign-in stays 12 hours', t => {
  process.env.ADMIN_PASSWORD = 'test-password'
  mocks['next/headers'] = { cookies: async () => ({ get: () => undefined }) }
  const auth = load('lib/admin-auth.ts')
  const day = 24 * 60 * 60
  assert.equal(auth.createAdminSessionToken().maxAge, day / 2)
  assert.equal(auth.createAdminSessionToken(true).maxAge, 90 * day)

  // A fresh app session needs no renewal; a browser session is never extended.
  assert.equal(auth.renewedAdminSession(auth.createAdminSessionToken(true).token), null)
  assert.equal(auth.renewedAdminSession(auth.createAdminSessionToken().token), null)
  assert.equal(auth.renewedAdminSession('123.forged'), null)
  assert.equal(auth.renewedAdminSession(undefined), null)

  // Two days later the app session is renewed to a full 90 days.
  const token = auth.createAdminSessionToken(true).token
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() + 2 * day * 1000 })
  const renewed = auth.renewedAdminSession(token)
  assert.ok(renewed)
  assert.equal(renewed.maxAge, 90 * day)
  assert.ok(Number(renewed.token.split('.')[0]) > Number(token.split('.')[0]))
})

test('db/007: old paid orders count as sent to the kitchen; re-running leaves new orders alone', async () => {
  const fs = require('node:fs')
  const path = require('node:path')
  const { PGlite } = require('@electric-sql/pglite')
  const root = path.resolve(__dirname, '..', '..')
  const sql = file => fs.readFileSync(path.join(root, 'db', file), 'utf8')
  const db = new PGlite()
  for (const file of ['003-cake-orders.sql', '004-cake-order-numbers.sql', '005-custom-cake-orders.sql'])
    await db.exec(sql(file))
  const add = (id, status) =>
    db.query(`INSERT INTO bakery_cake_orders(id,payload,status,pickup_at,created_at) VALUES($1,'x',$2,now(),now())`, [
      id,
      status,
    ])
  const sentAt = async id =>
    (await db.query('SELECT kitchen_sent_at FROM bakery_cake_orders WHERE id=$1', [id])).rows[0].kitchen_sent_at
  const id = n => `00000000-0000-4000-8000-00000000010${n}`
  await add(id(1), 'paid')
  await add(id(2), 'picked_up')
  await add(id(3), 'awaiting_approval')
  await db.exec(sql('007-kitchen-tracking.sql'))
  assert.ok(await sentAt(id(1)))
  assert.ok(await sentAt(id(2)))
  assert.equal(await sentAt(id(3)), null)

  // New statuses are accepted; a paid order added later stays "not sent" when the file is run again.
  await add(id(4), 'checking_kitchen')
  await add(id(5), 'paid')
  await db.exec(sql('007-kitchen-tracking.sql'))
  assert.equal(await sentAt(id(5)), null)
  await assert.rejects(add(id(6), 'made_up_status'))
  await db.close()
})

test('order actions: at most two buttons per order, the rest in the menu', () => {
  const { orderActionIds, isPrimaryAction } = load('lib/admin-order-actions.ts')
  const buttons = o => orderActionIds(o).filter(id => isPrimaryAction(o, id))
  for (const status of ['awaiting_approval', 'checking_kitchen', 'hold_expired'])
    assert.deepEqual(buttons(order(status, '2026-11-03')), ['review'], status)
  assert.deepEqual(buttons(order('paid', '2026-11-03')), ['picked_up'])
  assert.deepEqual(buttons(order('awaiting_payment', '2026-11-03', { kind: 'custom' })), ['resend_link'])
  assert.deepEqual(buttons(order('picked_up', '2026-10-30', { test: true })), [])
  const declined = orderActionIds(order('declined', '2026-11-03'))
  assert.ok(declined.includes('paid_offline') && declined.includes('copy_kitchen') && !declined.includes('review'))
  for (const status of ['awaiting_approval', 'paid', 'deposit_paid', 'picked_up', 'declined', 'expired'])
    assert.ok(buttons(order(status, '2026-11-03', { kind: 'custom', test: true })).length <= 2, status)
})
