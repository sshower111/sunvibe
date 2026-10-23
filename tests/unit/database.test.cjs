'use strict'
// Supabase data layer against a real in-memory PostgreSQL (PGlite): schema, migration gates,
// admin auth, parameterized SQL, exact cents, encrypted orders, campaigns, gallery and row-level
// security. No network or cloud writes. Run: pnpm test
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { test, after } = require('node:test')
const { PGlite } = require('@electric-sql/pglite')
const { createLoader } = require('../helpers/load-ts.cjs')

const db = new PGlite()
after(() => db.close())

/** Minimal stand-in for the postgres.js tagged-template client used by lib/database.ts. */
async function sql(strings, ...values) {
  const query = strings.reduce((text, part, i) => text + part + (i < values.length ? '$' + (i + 1) : ''), '')
  return (await db.query(query, values)).rows
}
sql.json = value => JSON.stringify(value)

const revalidatedTags = []
Object.assign(process.env, {
  ADMIN_PASSWORD: 'test-only',
  CAMPAIGN_STORAGE_SECRET: 'test-encryption',
  MENU_DATA_SOURCE: 'supabase',
  CONTENT_DATA_SOURCE: 'supabase',
  DATABASE_URL: 'test-only',
})
const { load, root } = createLoader({
  mocks: {
    postgres: () => sql,
    'next/cache': { revalidateTag: tag => revalidatedTags.push(tag) },
    'next/headers': { cookies: async () => ({ get: () => undefined }) },
  },
})

test('database-backed menu, orders, campaigns and gallery', async () => {
  await db.exec(fs.readFileSync(path.join(root, 'db/001-bakery.sql'), 'utf8'))
  const menu = load('lib/database-menu.ts')
  const content = load('lib/database-content.ts')
  const api = load('lib/database-product-api.ts')
  await assert.rejects(menu.databaseMenu())
  await assert.rejects(content.readCampaigns())
  await db.exec("INSERT INTO bakery_migrations(scope,record_count) VALUES('menu',0),('content',0)")
  const call = (action, body) =>
    api.databaseProductRequest(
      new Request('http://test.invalid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'test-only', action, ...body }),
      }),
    )
  assert.equal((await call('list', { password: 'bad' })).status, 401)
  const item = {
    name: "Chef's bun'); DROP TABLE bakery_menu;--",
    description: 'Fresh',
    price: '0.29',
    requestId: '11111111-1111-4111-8111-111111111111',
  }
  let r = await call('create', item)
  assert.equal(r.status, 200)
  const product = (await r.json()).product
  assert.equal(product.price, '0.29')
  assert.equal(product.name, item.name)
  assert.equal((await call('create', item)).status, 200)
  assert.equal((await menu.databaseMenu()).length, 1)
  assert.equal(
    (await call('update', { productId: product.id, name: 'Taro bun', description: '', price: '4.50' })).status,
    200,
  )
  assert.equal((await menu.databaseMenu())[0].price, '4.50')
  assert.equal((await call('toggle', { productId: product.id, active: false })).status, 200)
  assert.equal((await menu.databaseMenu()).length, 0)
  assert.equal((await menu.databaseMenu(true)).length, 1)
  assert.equal(
    (await call('update', { productId: product.id, name: 'Taro bun', description: '', price: '-1' })).status,
    400,
  )
  assert.equal(
    (await call('update', { productId: 'missing', name: 'Missing', description: '', price: '3' })).status,
    404,
  )
  const order = {
    id: '22222222-2222-4222-8222-222222222222',
    campaignId: 'festival',
    campaignName: 'Festival',
    createdAt: '2026-09-26T12:00:00.000Z',
    name: 'Private name',
    phone: '7025550100',
    email: '',
    pickupDate: '2026-09-28',
    items: [{ itemId: 'cake', name: 'Cake', qty: 1, price: 20 }],
    fulfillment: 'Pickup',
    notes: '',
    status: 'new',
  }
  await content.writeOrder(order)
  const before = (await db.query('SELECT payload FROM bakery_orders')).rows[0].payload
  assert(!before.includes(order.phone))
  await content.writeOrder(order)
  assert.equal((await db.query('SELECT payload FROM bakery_orders')).rows[0].payload, before)
  await assert.rejects(content.writeOrder({ ...order, name: 'Different' }))
  await content.setOrderStatus(order.id, 'confirmed')
  assert.equal((await content.readOrders())[0].status, 'confirmed')
  await assert.rejects(content.setOrderStatus('33333333-3333-4333-8333-333333333333', 'new'))
  await content.writeCampaign({ id: 'festival', name: 'First' })
  await content.writeCampaign({ id: 'festival', name: 'Second' })
  assert.equal((await content.readCampaigns()).length, 1)
  assert.equal((await content.readCampaigns())[0].name, 'Second')
  await content.editGallery('add', 'https://test.invalid/a.jpg')
  await content.editGallery('add', 'https://test.invalid/a.jpg')
  assert.equal((await content.readGallery()).length, 1)
  await content.editGallery('remove', 'https://test.invalid/a.jpg')
  assert.equal((await content.readGallery()).length, 0)
  assert(revalidatedTags.includes('menu-products'))
  await db.exec(
    'CREATE ROLE visitor; GRANT USAGE ON SCHEMA public TO visitor; GRANT SELECT, INSERT ON bakery_menu, bakery_orders TO visitor; SET ROLE visitor',
  )
  assert.equal((await db.query('SELECT * FROM bakery_menu')).rows.length, 0)
  assert.equal((await db.query('SELECT * FROM bakery_orders')).rows.length, 0)
  await assert.rejects(
    db.query("INSERT INTO bakery_menu(id,name,price_cents,image,category) VALUES('intruder','Bad',0,'','')"),
  )
  await db.exec('RESET ROLE')
})

test('cake inquiries are stored encrypted, with status and private notes', async () => {
  await db.exec(fs.readFileSync(path.join(root, 'db/002-cake-inquiries.sql'), 'utf8'))
  await db.exec(fs.readFileSync(path.join(root, 'db/002-cake-inquiries.sql'), 'utf8')) // re-runnable
  const store = load('lib/cake-inquiries-store.ts')
  const inquiry = {
    id: '44444444-4444-4444-8444-444444444444',
    createdAt: '2026-10-22T20:00:00.000Z',
    name: 'Amy',
    email: 'amy@example.test',
    phone: '7025550100',
    eventDate: '2099-01-20',
    eventTime: '',
    eventType: 'Birthday',
    servings: '12',
    size: '8-inch',
    flavor: 'Vanilla',
    filling: 'Mango',
    cakeMessage: "Happy 30th'); DROP TABLE bakery_cake_inquiries;--",
    budget: 'Under $100',
    fulfillment: 'Pickup',
    deliveryAddress: '',
    notes: '',
    photoCount: 2,
  }
  await store.saveCakeInquiry(inquiry)
  await store.saveCakeInquiry({ ...inquiry, name: 'Retry' }) // same id: ignored
  const raw = (await db.query('SELECT payload,status FROM bakery_cake_inquiries')).rows
  assert.equal(raw.length, 1)
  assert.equal(raw[0].status, 'new')
  assert(!raw[0].payload.includes(inquiry.email))
  let [stored] = await store.listCakeInquiries()
  assert.deepEqual(stored, { ...inquiry, status: 'new', staffNotes: '' })
  await store.updateCakeInquiry(inquiry.id, { status: 'checking_owner' })
  await store.updateCakeInquiry(inquiry.id, { staffNotes: 'Final $85, paid by Zelle' })
  assert(!(await db.query('SELECT staff_notes FROM bakery_cake_inquiries')).rows[0].staff_notes.includes('Zelle'))
  ;[stored] = await store.listCakeInquiries()
  assert.equal(stored.status, 'checking_owner')
  assert.equal(stored.staffNotes, 'Final $85, paid by Zelle')
  await store.updateCakeInquiry(inquiry.id, { staffNotes: '' })
  assert.equal((await store.listCakeInquiries())[0].staffNotes, '')
  await assert.rejects(db.query("UPDATE bakery_cake_inquiries SET status='paid'"))
  await assert.rejects(store.updateCakeInquiry('55555555-5555-4555-8555-555555555555', { status: 'new' }))
})
