'use strict'
// Customer photos store (db/013) against a real in-memory PostgreSQL (PGlite).
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
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
  CAMPAIGN_STORAGE_SECRET: 'test-encryption',
  CONTENT_DATA_SOURCE: 'supabase',
  DATABASE_URL: 'test-only',
})
const files = {}
const sentTo = []
const orders = {}
const { load, root } = createLoader({
  mocks: {
    postgres: () => sql,
    './cake-orders-store': { getCakeOrder: async id => orders[id] ?? null },
    './cake-order-email': { sendThankYouEmail: async o => (sentTo.push(o.id), true) },
    './photo-storage': {
      uploadPrivateFile: async (p, data) => (files[p] = data),
      downloadPrivateFile: async p => files[p],
      removePrivateFiles: async paths => paths.forEach(p => delete files[p]),
    },
  },
})

test('submissions: note encrypted, photos appended and counted per order, gallery marked, deleted with files', async () => {
  await db.exec(fs.readFileSync(path.join(root, 'db/001-bakery.sql'), 'utf8'))
  await db.exec("INSERT INTO bakery_migrations(scope,record_count) VALUES('menu',0),('content',0)")
  await db.exec(fs.readFileSync(path.join(root, 'db/013-customer-photos.sql'), 'utf8'))
  await db.exec(fs.readFileSync(path.join(root, 'db/013-customer-photos.sql'), 'utf8')) // re-runnable
  const store = load('lib/customer-photos.ts')
  const order = '00000000-0000-4000-8000-000000000001'
  const sub = '00000000-0000-4000-8000-000000000002'
  await store.saveSubmission({ id: sub, orderId: order, note: 'Loved the mango!', consent: true })
  assert(!(await db.query('SELECT note FROM bakery_customer_photos')).rows[0].note.includes('mango'), 'encrypted')
  const a = await store.addSubmissionPhoto(sub, order, Buffer.from('one'))
  const b = await store.addSubmissionPhoto(sub, order, Buffer.from('two'))
  assert.equal(a, `${sub}-1.jpg`)
  assert.equal(b, `${sub}-2.jpg`)
  assert.match(a, store.PHOTO_FILE)
  assert.equal(await store.photoCountForOrder(order), 2)
  // A later request of the same submission updates the answer; another order can't take it over.
  await store.saveSubmission({ id: sub, orderId: order, note: 'Loved the mango!', consent: false })
  await assert.rejects(
    store.saveSubmission({ id: sub, orderId: '00000000-0000-4000-8000-000000000009', note: '', consent: true }),
  )
  await store.markInGallery(sub, b, 'https://cdn.example/x.jpg')
  const [entry] = await store.listCustomerPhotos()
  assert.equal(entry.note, 'Loved the mango!')
  assert.equal(entry.consent, false)
  assert.deepEqual(entry.photos, [{ file: a }, { file: b, gallery: 'https://cdn.example/x.jpg' }])
  assert.equal(String(await store.readCustomerPhoto(order, a)), 'one')
  await store.deleteCustomerPhotos(sub)
  assert.equal((await store.listCustomerPhotos()).length, 0)
  assert.equal(Object.keys(files).length, 0)
})

test('thank-you emails: orders picked up 24 to 72 hours ago, once each, daytime only', async () => {
  await db.exec(fs.readFileSync(path.join(root, 'db/008-push-notifications.sql'), 'utf8'))
  await db.exec(fs.readFileSync(path.join(root, 'db/009-cake-order-events.sql'), 'utf8'))
  const thanks = load('lib/thank-you.ts')
  const now = new Date('2026-11-05T19:00:00Z') // 11 AM in Las Vegas
  const ago = hours => new Date(now.getTime() - hours * 3_600_000).toISOString()
  const id = n => `00000000-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`
  for (const [n, hours, action] of [
    [1, 25, 'picked_up'], // due
    [2, 30, 'delivered'], // due
    [3, 5, 'picked_up'], // too soon
    [4, 100, 'picked_up'], // too old: picked up before this was turned on
    [5, 26, 'paid'], // not picked up
    [7, 25, 'picked_up'], // a regular online order: no thank-you
  ]) {
    orders[id(n)] = { id: id(n), kind: n === 7 ? undefined : 'custom', status: n === 5 ? 'paid' : 'picked_up' }
    await db.query('INSERT INTO bakery_cake_order_events(order_id,at,action) VALUES($1,$2,$3)', [
      id(n),
      ago(hours),
      action,
    ])
  }
  orders[id(6)] = { id: id(6), kind: 'custom', status: 'paid' } // picked up, then undone
  await db.query('INSERT INTO bakery_cake_order_events(order_id,at,action) VALUES($1,$2,$3)', [
    id(6),
    ago(25),
    'picked_up',
  ])
  assert.equal(await thanks.sendDueThankYous(now), 2)
  assert.deepEqual(sentTo.sort(), [id(1), id(2)])
  assert.equal(await thanks.sendDueThankYous(now), 0, 'once per order')
  assert.equal(await thanks.sendDueThankYous(new Date('2026-11-06T06:00:00Z')), 0, '10 PM: not sent')
  // Admin "Send thank-you email now": also once.
  orders[id(3)] = { id: id(3), kind: 'custom', status: 'picked_up' }
  assert.equal(await thanks.sendThankYou(id(3)), true)
  assert.equal(await thanks.sendThankYou(id(3)), false)
})
